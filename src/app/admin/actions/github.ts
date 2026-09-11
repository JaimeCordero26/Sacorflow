"use server";

import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireSession } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { createRepo, createWebhook, getRepo, getUserToken } from "@/lib/github-oauth";
import { getProjectDetail, refreshProjectProgress } from "@/server/services/project.service";
import { getDb } from "@/db";
import { insertProgressEvent, updateProjectGithubLink, updateProjectRepo } from "@/server/models/project.model";

// slug para nombre de repo: minúsculas, alfanumérico + guiones.
function slugRepo(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return s || `proyecto-${Date.now()}`;
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
export async function linkExistingRepoAction(
  projectId: string,
  repoInput: string,
): Promise<{ ok: boolean; error?: string; repo?: string; url?: string }> {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();

  const repo = normalizeRepo(repoInput);
  if (!repo)
    return { ok: false, error: "Formato inválido. Usa owner/repo o la URL." };

  const project = await getProjectDetail(projectId);
  if (!project) return { ok: false, error: "Proyecto no encontrado" };
  if (!project.createdBy)
    return { ok: false, error: "La idea no tiene creador asignado" };

  const token = await getUserToken(env, project.createdBy);
  if (!token)
    return {
      ok: false,
      error: "El creador de la idea debe conectar su GitHub en Perfil",
    };

  let info;
  try {
    info = await getRepo(token, repo);
  } catch (e) {
    console.error("[linkExistingRepoAction]", e);
    return {
      ok: false,
      error: "No se pudo acceder al repo (¿existe y el creador tiene acceso?)",
    };
  }

  await updateProjectGithubLink(db, projectId, {
    repoGithub: info.full_name,
    installationId: null,
    milestoneId: null,
    milestoneTitle: null,
  });

  await insertProgressEvent(db, {
    id: newId(),
    projectId,
    type: "repo",
    description: `Repositorio vinculado: ${info.full_name}.`,
  });

  await refreshProjectProgress(projectId);
  revalidatePath(`/admin/proyectos/${projectId}`);
  revalidatePath("/admin/kanban");
  return { ok: true, repo: info.full_name, url: info.html_url };
}

// Crea el repo en la cuenta del socio que CREÓ la idea. Devuelve resultado.
export async function createRepoForIdeaAction(
  projectId: string,
): Promise<{ ok: boolean; error?: string; repo?: string; url?: string }> {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();

  const project = await getProjectDetail(projectId);
  if (!project) return { ok: false, error: "Proyecto no encontrado" };
  if (project.repoGithub) return { ok: false, error: "Ya tiene repositorio" };
  if (!project.createdBy)
    return { ok: false, error: "La idea no tiene creador asignado" };

  const token = await getUserToken(env, project.createdBy);
  if (!token)
    return {
      ok: false,
      error: "El creador de la idea debe conectar su GitHub en Perfil",
    };

  try {
    const repo = await createRepo(token, {
      name: slugRepo(project.name),
      description: project.description ?? `Proyecto SacorTech: ${project.name}`,
      private: true,
    });

    await updateProjectRepo(db, projectId, repo.full_name);

    // Webhook opcional (necesita host público en APP_URL).
    if (env.APP_URL && env.GITHUB_WEBHOOK_SECRET) {
      try {
        await createWebhook(token, repo.full_name, {
          url: new URL("/api/webhooks/github", env.APP_URL).toString(),
          secret: env.GITHUB_WEBHOOK_SECRET,
        });
      } catch (e) {
        console.error("[createRepoForIdeaAction] webhook", e);
      }
    }

    await insertProgressEvent(db, {
      id: newId(),
      projectId,
      type: "repo",
      description: `Repositorio creado: ${repo.full_name}.`,
    });

    revalidatePath(`/admin/proyectos/${projectId}`);
    revalidatePath("/admin/kanban");
    return { ok: true, repo: repo.full_name, url: repo.html_url };
  } catch (e) {
    console.error("[createRepoForIdeaAction]", e);
    return { ok: false, error: "Fallo al crear el repo en GitHub" };
  }
}
