"use server";

import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ideasComentarios, issuesPropuestos, proyectos, tareas, usuarios } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { createIssue, getUserToken } from "@/lib/github-oauth";
import { desglosarIdea } from "@/lib/ai";
import { refrescarProgreso } from "./proyectos";

export async function generarPropuestas(
  proyectoId: string,
): Promise<{ ok: boolean; n?: number; error?: string }> {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();

  const proj = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj) return { ok: false, error: "Proyecto no encontrado" };

  const comentarios = await db
    .select({ texto: ideasComentarios.texto, autor: usuarios.nombre })
    .from(ideasComentarios)
    .leftJoin(usuarios, eq(usuarios.id, ideasComentarios.autorId))
    .where(eq(ideasComentarios.proyectoId, proyectoId))
    .all();

  let sugeridos;
  try {
    sugeridos = await desglosarIdea(env, {
      titulo: proj.nombre,
      descripcion: proj.descripcion,
      comentarios: comentarios.map((c) => ({
        autor: c.autor ?? "Socio",
        texto: c.texto,
      })),
    });
  } catch (e) {
    console.error("[generarPropuestas] AI", e);
    return { ok: false, error: "La IA no pudo procesar la idea" };
  }
  if (sugeridos.length === 0)
    return { ok: false, error: "La IA no devolvió propuestas válidas" };

  // Reemplaza las propuestas pendientes previas (conserva aceptadas/creadas).
  await db
    .delete(issuesPropuestos)
    .where(
      and(
        eq(issuesPropuestos.proyectoId, proyectoId),
        eq(issuesPropuestos.estado, "propuesto"),
      ),
    );

  for (const s of sugeridos) {
    await db.insert(issuesPropuestos).values({
      id: newId(),
      proyectoId,
      titulo: s.titulo,
      cuerpo: s.cuerpo,
      origen: "ia",
      estado: "propuesto",
    });
  }

  revalidatePath(`/admin/proyectos/${proyectoId}`);
  return { ok: true, n: sugeridos.length };
}

export async function marcarPropuesta(
  id: string,
  estado: "aceptado" | "descartado" | "propuesto",
) {
  await requireSession();
  const db = getDb();
  const row = await db
    .select({ proyectoId: issuesPropuestos.proyectoId })
    .from(issuesPropuestos)
    .where(eq(issuesPropuestos.id, id))
    .get();
  await db
    .update(issuesPropuestos)
    .set({ estado })
    .where(eq(issuesPropuestos.id, id));
  if (row) revalidatePath(`/admin/proyectos/${row.proyectoId}`);
}

// Crea en GitHub los issues aceptados que aún no existen.
export async function crearIssuesAceptados(
  proyectoId: string,
): Promise<{ ok: boolean; creados?: number; error?: string }> {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();

  const proj = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj?.repoGithub)
    return { ok: false, error: "Primero crea el repositorio" };
  if (!proj.creadoPor) return { ok: false, error: "Idea sin creador" };

  const token = await getUserToken(env, proj.creadoPor);
  if (!token)
    return { ok: false, error: "El creador debe conectar su GitHub" };

  const pendientes = await db
    .select()
    .from(issuesPropuestos)
    .where(
      and(
        eq(issuesPropuestos.proyectoId, proyectoId),
        eq(issuesPropuestos.estado, "aceptado"),
      ),
    )
    .all();

  let creados = 0;
  for (const p of pendientes) {
    if (p.githubIssueNumber) continue;
    try {
      const issue = await createIssue(token, proj.repoGithub, {
        title: p.titulo,
        body: p.cuerpo,
      });
      await db
        .update(issuesPropuestos)
        .set({
          githubIssueNumber: issue.number,
          githubIssueUrl: issue.html_url,
        })
        .where(eq(issuesPropuestos.id, p.id));
      // También aparece como tarea en el tablero de sprints/backlog del proyecto.
      await db.insert(tareas).values({
        id: newId(),
        proyectoId,
        titulo: p.titulo,
        columnaKanban: "por_hacer",
        origen: "github_import",
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.html_url,
        githubIssueState: "open",
        creadoPor: proj.creadoPor,
      });
      creados++;
    } catch (e) {
      console.error("[crearIssuesAceptados]", e);
    }
  }

  if (creados > 0) await refrescarProgreso(proyectoId);
  revalidatePath(`/admin/proyectos/${proyectoId}`);
  return { ok: true, creados };
}
