"use server";

import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  eventosProgreso,
  ideasComentarios,
  mensajesChat,
  proyectos,
  type ColumnaKanban,
} from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { newId, newPublicToken } from "@/lib/ids";
import { computeProgress } from "@/lib/github-app";
import { getUserToken, progressWithToken } from "@/lib/github-oauth";

const COLUMNS: ColumnaKanban[] = ["idea", "en_progreso", "listo", "pausado", "cancelado", "cerrado", "entregado"];

export async function crearProyecto(formData: FormData) {
  const session = await requireSession();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!nombre) return;

  const db = getDb();
  await db.insert(proyectos).values({
    id: newId(),
    nombre,
    descripcion: descripcion || null,
    columnaKanban: "idea",
    tokenPublico: newPublicToken(),
    creadoPor: session.uid,
  });
  revalidatePath("/admin/kanban");
}

export async function eliminarProyecto(proyectoId: string) {
  await requireSession();
  const db = getDb();
  // Los hijos (comentarios, issues, eventos, mensajes, pivote cliente) tienen
  // onDelete: "cascade" en el schema, así que se borran solos.
  await db.delete(proyectos).where(eq(proyectos.id, proyectoId));
  revalidatePath("/admin/kanban");
  revalidatePath("/admin");
}

export async function moverTarjeta(
  proyectoId: string,
  columna: ColumnaKanban,
  orden: number,
) {
  await requireSession();
  if (!COLUMNS.includes(columna)) return;
  const db = getDb();
  await db
    .update(proyectos)
    .set({ columnaKanban: columna, orden })
    .where(eq(proyectos.id, proyectoId));
  revalidatePath("/admin/kanban");
}

export async function agregarComentario(proyectoId: string, texto: string) {
  const session = await requireSession();
  const t = texto.trim();
  if (!t) return;
  const db = getDb();
  await db.insert(ideasComentarios).values({
    id: newId(),
    proyectoId,
    autorId: session.uid,
    texto: t,
  });
  revalidatePath(`/admin/proyectos/${proyectoId}`);
  revalidatePath("/admin/kanban");
}

export async function vincularGithub(
  proyectoId: string,
  data: {
    repoGithub: string;
    installationId: number;
    milestoneId?: number | null;
    milestoneTitulo?: string | null;
  },
) {
  await requireSession();
  const db = getDb();
  // Only projects that are "en_progreso" may be linked to GitHub.
  const proj = await db
    .select({ columna: proyectos.columnaKanban })
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj || proj.columna !== "en_progreso") return;

  await db
    .update(proyectos)
    .set({
      repoGithub: data.repoGithub.trim(),
      installationId: data.installationId,
      milestoneId: data.milestoneId ?? null,
      milestoneTitulo: data.milestoneTitulo ?? null,
    })
    .where(eq(proyectos.id, proyectoId));

  await refrescarProgreso(proyectoId);
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function refrescarProgreso(proyectoId: string) {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();
  const proj = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj?.repoGithub) return;

  try {
    let result: { pct: number; closed: number; total: number } | null = null;

    // Preferir el user token del creador (repos creados por la app).
    const creadorToken = proj.creadoPor
      ? await getUserToken(env, proj.creadoPor)
      : null;
    if (creadorToken) {
      result = await progressWithToken(creadorToken, proj.repoGithub);
    } else if (proj.installationId) {
      // Fallback: GitHub App (repos vinculados a mano).
      result = await computeProgress(env, {
        installationId: proj.installationId,
        repo: proj.repoGithub,
        milestoneId: proj.milestoneId,
      });
    }
    if (!result) return;

    await db
      .update(proyectos)
      .set({ progresoPct: result.pct })
      .where(eq(proyectos.id, proyectoId));
    await db.insert(eventosProgreso).values({
      id: newId(),
      proyectoId,
      tipo: "progreso",
      descripcion: `Progreso actualizado: ${result.closed} de ${result.total} tareas completadas (${result.pct}%).`,
      progresoPct: result.pct,
    });
  } catch (e) {
    console.error("[refrescarProgreso]", e);
  }
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function actualizarEtapa(proyectoId: string, etapa: string) {
  await requireSession();
  const db = getDb();
  await db
    .update(proyectos)
    .set({ etapaActual: etapa })
    .where(eq(proyectos.id, proyectoId));
  await db.insert(eventosProgreso).values({
    id: newId(),
    proyectoId,
    tipo: "etapa",
    descripcion: `El proyecto avanzó a la etapa: ${etapa}.`,
  });
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function cambiarActivo(proyectoId: string, activo: boolean) {
  await requireSession();
  const db = getDb();
  await db
    .update(proyectos)
    .set({ activo })
    .where(eq(proyectos.id, proyectoId));
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function marcarLeido(proyectoId: string) {
  await requireSession();
  const db = getDb();
  await db
    .update(mensajesChat)
    .set({ leido: true })
    .where(
      and(
        eq(mensajesChat.proyectoId, proyectoId),
        eq(mensajesChat.autorTipo, "cliente"),
      ),
    );
  revalidatePath("/admin");
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}
