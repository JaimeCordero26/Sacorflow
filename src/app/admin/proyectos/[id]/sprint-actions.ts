"use server";

import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { proyectos, sprints, tareas, type ColumnaTarea } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { newId } from "@/lib/ids";
import { getUserToken, listIssues, type GithubIssueLite } from "@/lib/github-user";

const COLUMNAS: ColumnaTarea[] = ["por_hacer", "en_progreso", "revision", "hecho"];

// ---------- Sprints ----------

export async function crearSprint(
  proyectoId: string,
  nombre: string,
  fechaInicio?: string,
  fechaFin?: string,
) {
  await requireSession();
  const n = nombre.trim();
  if (!n) return;
  const db = getDb();
  const existentes = await db
    .select({ id: sprints.id })
    .from(sprints)
    .where(eq(sprints.proyectoId, proyectoId))
    .all();
  await db.insert(sprints).values({
    id: newId(),
    proyectoId,
    nombre: n,
    fechaInicio: fechaInicio || null,
    fechaFin: fechaFin || null,
    orden: existentes.length,
  });
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function iniciarSprint(sprintId: string, proyectoId: string) {
  await requireSession();
  const db = getDb();
  await db.update(sprints).set({ estado: "activo" }).where(eq(sprints.id, sprintId));
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function cerrarSprint(sprintId: string, proyectoId: string) {
  await requireSession();
  const db = getDb();
  await db
    .update(sprints)
    .set({ estado: "cerrado", cerradoEn: new Date().toISOString() })
    .where(eq(sprints.id, sprintId));
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function eliminarSprint(sprintId: string, proyectoId: string) {
  await requireSession();
  const db = getDb();
  // Las tareas del sprint quedan en backlog (onDelete: "set null" en schema).
  await db.delete(sprints).where(eq(sprints.id, sprintId));
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

// ---------- Tareas ----------

export async function crearTarea(
  proyectoId: string,
  sprintId: string | null,
  titulo: string,
  descripcion?: string,
) {
  const session = await requireSession();
  const t = titulo.trim();
  if (!t) return;
  const db = getDb();
  await db.insert(tareas).values({
    id: newId(),
    proyectoId,
    sprintId,
    titulo: t,
    descripcion: descripcion?.trim() || null,
    columnaKanban: "por_hacer",
    origen: "manual",
    creadoPor: session.uid,
  });
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function moverTarea(
  tareaId: string,
  proyectoId: string,
  columna: ColumnaTarea,
  orden: number,
) {
  await requireSession();
  if (!COLUMNAS.includes(columna)) return;
  const db = getDb();
  await db
    .update(tareas)
    .set({ columnaKanban: columna, orden, actualizadoEn: new Date().toISOString() })
    .where(eq(tareas.id, tareaId));
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function moverTareaASprint(
  tareaId: string,
  proyectoId: string,
  sprintId: string | null,
) {
  await requireSession();
  const db = getDb();
  await db
    .update(tareas)
    .set({ sprintId, orden: 0, actualizadoEn: new Date().toISOString() })
    .where(eq(tareas.id, tareaId));
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function eliminarTarea(tareaId: string, proyectoId: string) {
  await requireSession();
  const db = getDb();
  await db.delete(tareas).where(eq(tareas.id, tareaId));
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function importarIssueComoTarea(
  proyectoId: string,
  sprintId: string | null,
  columnaInicial: ColumnaTarea,
  issue: { number: number; title: string; url: string },
) {
  const session = await requireSession();
  if (!COLUMNAS.includes(columnaInicial)) return;
  const db = getDb();
  await db.insert(tareas).values({
    id: newId(),
    proyectoId,
    sprintId,
    titulo: issue.title,
    columnaKanban: columnaInicial,
    origen: "github_import",
    githubIssueNumber: issue.number,
    githubIssueUrl: issue.url,
    githubIssueState: "open",
    creadoPor: session.uid,
  });
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

// ---------- Pool de issues de GitHub ----------

export async function cargarIssuesDisponibles(
  proyectoId: string,
): Promise<{ ok: boolean; issues?: GithubIssueLite[]; error?: string }> {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();

  const proj = await db
    .select({ repoGithub: proyectos.repoGithub, creadoPor: proyectos.creadoPor })
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj?.repoGithub) return { ok: false, error: "El proyecto no tiene repo vinculado." };

  const token = proj.creadoPor ? await getUserToken(env, proj.creadoPor) : null;
  if (!token) return { ok: false, error: "El creador del proyecto no tiene GitHub conectado." };

  try {
    const abiertos = await listIssues(token, proj.repoGithub, { state: "open" });
    const yaImportadas = await db
      .select({ n: tareas.githubIssueNumber })
      .from(tareas)
      .where(and(eq(tareas.proyectoId, proyectoId), eq(tareas.origen, "github_import")))
      .all();
    const numerosUsados = new Set(yaImportadas.map((t) => t.n));
    return { ok: true, issues: abiertos.filter((i) => !numerosUsados.has(i.number)) };
  } catch (e) {
    console.error("[cargarIssuesDisponibles]", e);
    return { ok: false, error: "No se pudieron cargar los issues de GitHub." };
  }
}
