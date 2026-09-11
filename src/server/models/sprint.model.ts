import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sprints, tareas, type ColumnaTarea } from "@/db/schema";
import type { Sprint, SprintStatus } from "@/entities/sprint/model/types";
import type { Task, TaskColumn, TaskOrigin } from "@/entities/task/model/types";

function toSprint(row: typeof sprints.$inferSelect): Sprint {
  return {
    id: row.id,
    name: row.nombre,
    status: row.estado as SprintStatus,
    startDate: row.fechaInicio,
    endDate: row.fechaFin,
    order: row.orden,
  };
}

function toTask(row: typeof tareas.$inferSelect): Task {
  return {
    id: row.id,
    title: row.titulo,
    description: row.descripcion,
    column: row.columnaKanban as TaskColumn,
    order: row.orden,
    sprintId: row.sprintId,
    origin: row.origen as TaskOrigin,
    githubIssueNumber: row.githubIssueNumber,
    githubIssueUrl: row.githubIssueUrl,
  };
}

export async function listSprintsForProject(
  db: ReturnType<typeof getDb>,
  projectId: string,
): Promise<Sprint[]> {
  const rows = await db
    .select()
    .from(sprints)
    .where(eq(sprints.proyectoId, projectId))
    .orderBy(asc(sprints.orden))
    .all();
  return rows.map(toSprint);
}

export async function listTasksForProject(
  db: ReturnType<typeof getDb>,
  projectId: string,
): Promise<Task[]> {
  const rows = await db.select().from(tareas).where(eq(tareas.proyectoId, projectId)).all();
  return rows.map(toTask);
}

export async function insertSprint(
  db: ReturnType<typeof getDb>,
  data: {
    id: string;
    projectId: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    order: number;
  },
): Promise<void> {
  await db.insert(sprints).values({
    id: data.id,
    proyectoId: data.projectId,
    nombre: data.name,
    fechaInicio: data.startDate,
    fechaFin: data.endDate,
    orden: data.order,
  });
}

export async function countSprintsForProject(
  db: ReturnType<typeof getDb>,
  projectId: string,
): Promise<number> {
  const rows = await db
    .select({ id: sprints.id })
    .from(sprints)
    .where(eq(sprints.proyectoId, projectId))
    .all();
  return rows.length;
}

export async function updateSprintStatus(
  db: ReturnType<typeof getDb>,
  id: string,
  status: SprintStatus,
  closedAt?: string | null,
): Promise<void> {
  const set: Record<string, unknown> = { estado: status };
  if (closedAt !== undefined) set.cerradoEn = closedAt;
  await db.update(sprints).set(set).where(eq(sprints.id, id));
}

export async function deleteSprintById(
  db: ReturnType<typeof getDb>,
  id: string,
): Promise<void> {
  // Las tareas del sprint quedan en backlog (onDelete: "set null" en schema).
  await db.delete(sprints).where(eq(sprints.id, id));
}

export async function insertTask(
  db: ReturnType<typeof getDb>,
  data: {
    id: string;
    projectId: string;
    sprintId: string | null;
    title: string;
    description: string | null;
    column?: TaskColumn;
    origin: TaskOrigin;
    githubIssueNumber: number | null;
    githubIssueUrl: string | null;
    githubIssueState: "open" | null;
    createdBy: string;
  },
): Promise<void> {
  await db.insert(tareas).values({
    id: data.id,
    proyectoId: data.projectId,
    sprintId: data.sprintId,
    titulo: data.title,
    descripcion: data.description,
    columnaKanban: (data.column ?? "por_hacer") as ColumnaTarea,
    origen: data.origin,
    githubIssueNumber: data.githubIssueNumber,
    githubIssueUrl: data.githubIssueUrl,
    githubIssueState: data.githubIssueState,
    creadoPor: data.createdBy,
  });
}

export async function updateTaskColumn(
  db: ReturnType<typeof getDb>,
  id: string,
  column: TaskColumn,
  order: number,
): Promise<void> {
  await db
    .update(tareas)
    .set({ columnaKanban: column as ColumnaTarea, orden: order, actualizadoEn: new Date().toISOString() })
    .where(eq(tareas.id, id));
}

export async function updateTaskSprint(
  db: ReturnType<typeof getDb>,
  id: string,
  sprintId: string | null,
): Promise<void> {
  await db
    .update(tareas)
    .set({ sprintId, orden: 0, actualizadoEn: new Date().toISOString() })
    .where(eq(tareas.id, id));
}

export async function deleteTaskById(
  db: ReturnType<typeof getDb>,
  id: string,
): Promise<void> {
  await db.delete(tareas).where(eq(tareas.id, id));
}

export async function listImportedGithubIssueNumbers(
  db: ReturnType<typeof getDb>,
  projectId: string,
): Promise<Set<number | null>> {
  const rows = await db
    .select({ n: tareas.githubIssueNumber })
    .from(tareas)
    .where(and(eq(tareas.proyectoId, projectId), eq(tareas.origen, "github_import")))
    .all();
  return new Set(rows.map((r) => r.n));
}
