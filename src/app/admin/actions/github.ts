"use server";

import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { eventosProgreso, githubCuentas, proyectos } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { createRepo, createWebhook, getRepo, getUserToken } from "@/lib/github-oauth";
import { refrescarProgreso } from "./proyectos";

// slug para nombre de repo: minúsculas, alfanumérico + guiones.
function slugRepo(nombre: string): string {
  const s = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return s || `proyecto-${Date.now()}`;
}

export async function desconectarGithub() {
  const session = await requireSession();
  const db = getDb();
  await db.delete(githubCuentas).where(eq(githubCuentas.usuarioId, session.uid));
  revalidatePath("/admin/perfil");
}

// Acepta "owner/repo", una URL completa de GitHub, o con ".git", y normaliza a
// "owner/repo". Devuelve null si no puede extraer un par válido.
function normalizeRepo(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  s = s.replace(/\.git$/i, "").replace(/\/+$/, "");
  const m = s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

// Vincula un repo YA existente (de la cuenta del creador) a la idea, usando su
// user token OAuth. No requiere Installation ID de GitHub App.
export async function vincularRepoExistente(
  proyectoId: string,
  repoInput: string,
): Promise<{ ok: boolean; error?: string; repo?: string; url?: string }> {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();

  const repo = normalizeRepo(repoInput);
  if (!repo)
    return { ok: false, error: "Formato inválido. Usa owner/repo o la URL." };

  const proj = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj) return { ok: false, error: "Proyecto no encontrado" };
  if (!proj.creadoPor)
    return { ok: false, error: "La idea no tiene creador asignado" };

  const token = await getUserToken(env, proj.creadoPor);
  if (!token)
    return {
      ok: false,
      error: "El creador de la idea debe conectar su GitHub en Perfil",
    };

  let info;
  try {
    info = await getRepo(token, repo);
  } catch (e) {
    console.error("[vincularRepoExistente]", e);
    return {
      ok: false,
      error: "No se pudo acceder al repo (¿existe y el creador tiene acceso?)",
    };
  }

  await db
    .update(proyectos)
    .set({
      repoGithub: info.full_name,
      installationId: null,
      milestoneId: null,
      milestoneTitulo: null,
    })
    .where(eq(proyectos.id, proyectoId));

  await db.insert(eventosProgreso).values({
    id: newId(),
    proyectoId,
    tipo: "repo",
    descripcion: `Repositorio vinculado: ${info.full_name}.`,
  });

  await refrescarProgreso(proyectoId);
  revalidatePath(`/admin/proyectos/${proyectoId}`);
  revalidatePath("/admin/kanban");
  return { ok: true, repo: info.full_name, url: info.html_url };
}

// Crea el repo en la cuenta del socio que CREÓ la idea. Devuelve resultado.
export async function crearRepoParaIdea(
  proyectoId: string,
): Promise<{ ok: boolean; error?: string; repo?: string; url?: string }> {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();

  const proj = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj) return { ok: false, error: "Proyecto no encontrado" };
  if (proj.repoGithub) return { ok: false, error: "Ya tiene repositorio" };
  if (!proj.creadoPor)
    return { ok: false, error: "La idea no tiene creador asignado" };

  const token = await getUserToken(env, proj.creadoPor);
  if (!token)
    return {
      ok: false,
      error: "El creador de la idea debe conectar su GitHub en Perfil",
    };

  try {
    const repo = await createRepo(token, {
      name: slugRepo(proj.nombre),
      description: proj.descripcion ?? `Proyecto SacorTech: ${proj.nombre}`,
      private: true,
    });

    await db
      .update(proyectos)
      .set({ repoGithub: repo.full_name })
      .where(eq(proyectos.id, proyectoId));

    // Webhook opcional (necesita host público en APP_URL).
    if (env.APP_URL && env.GITHUB_WEBHOOK_SECRET) {
      try {
        await createWebhook(token, repo.full_name, {
          url: new URL("/api/webhooks/github", env.APP_URL).toString(),
          secret: env.GITHUB_WEBHOOK_SECRET,
        });
      } catch (e) {
        console.error("[crearRepoParaIdea] webhook", e);
      }
    }

    await db.insert(eventosProgreso).values({
      id: newId(),
      proyectoId,
      tipo: "repo",
      descripcion: `Repositorio creado: ${repo.full_name}.`,
    });

    revalidatePath(`/admin/proyectos/${proyectoId}`);
    revalidatePath("/admin/kanban");
    return { ok: true, repo: repo.full_name, url: repo.html_url };
  } catch (e) {
    console.error("[crearRepoParaIdea]", e);
    return { ok: false, error: "Fallo al crear el repo en GitHub" };
  }
}
