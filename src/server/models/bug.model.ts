import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bugs, proyectos } from "@/db/schema";
import type { Bug, Priority, Status } from "@/entities/bug/model/types";

export interface ProjectOption {
  id: string;
  name: string;
}

export async function listBugs(db: ReturnType<typeof getDb>): Promise<Bug[]> {
  const rows = await db
    .select({
      id: bugs.id,
      titulo: bugs.titulo,
      descripcion: bugs.descripcion,
      prioridad: bugs.prioridad,
      estado: bugs.estado,
      proyectoId: bugs.proyectoId,
      proyectoNombre: proyectos.nombre,
      creadoEn: bugs.creadoEn,
      resueltoEn: bugs.resueltoEn,
    })
    .from(bugs)
    .leftJoin(proyectos, eq(proyectos.id, bugs.proyectoId))
    .orderBy(desc(bugs.creadoEn))
    .all();

  return rows.map((r) => ({
    id: r.id,
    title: r.titulo,
    description: r.descripcion,
    priority: r.prioridad as Priority,
    status: r.estado as Status,
    projectId: r.proyectoId,
    projectName: r.proyectoNombre,
    createdAt: r.creadoEn,
    resolvedAt: r.resueltoEn,
  }));
}

export async function listProjectOptions(
  db: ReturnType<typeof getDb>,
): Promise<ProjectOption[]> {
  const rows = await db
    .select({ id: proyectos.id, nombre: proyectos.nombre })
    .from(proyectos)
    .orderBy(asc(proyectos.nombre))
    .all();
  return rows.map((r) => ({ id: r.id, name: r.nombre }));
}

export async function insertBug(
  db: ReturnType<typeof getDb>,
  data: {
    id: string;
    title: string;
    description: string | null;
    priority: Priority;
    projectId: string | null;
    createdBy: string;
  },
): Promise<void> {
  await db.insert(bugs).values({
    id: data.id,
    titulo: data.title,
    descripcion: data.description,
    prioridad: data.priority,
    estado: "abierto",
    proyectoId: data.projectId,
    creadoPor: data.createdBy,
  });
}

export async function updateBugFields(
  db: ReturnType<typeof getDb>,
  id: string,
  set: Record<string, unknown>,
): Promise<void> {
  await db.update(bugs).set(set).where(eq(bugs.id, id));
}

export async function deleteBugById(
  db: ReturnType<typeof getDb>,
  id: string,
): Promise<void> {
  await db.delete(bugs).where(eq(bugs.id, id));
}
