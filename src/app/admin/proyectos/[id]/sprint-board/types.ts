import type { ColumnaTarea, EstadoSprint, Sprint, Tarea } from "@/db/schema";
import type { GithubIssueLite } from "@/lib/github-oauth";

export type { ColumnaTarea, EstadoSprint, GithubIssueLite };
export type OrigenTarea = "manual" | "github_import" | "ia_propuesta";

export interface TareaCard {
  id: string;
  titulo: string;
  descripcion: string | null;
  columna: ColumnaTarea;
  orden: number;
  sprintId: string | null;
  origen: OrigenTarea;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
}

export interface SprintInfo {
  id: string;
  nombre: string;
  estado: EstadoSprint;
  fechaInicio: string | null;
  fechaFin: string | null;
  orden: number;
}

// Adaptan una fila de Drizzle (columnas sueltas, sin tipar los enums) a la
// forma que espera el tablero. Viven aquí, junto a los tipos, para que la
// query en `src/db/queries/proyectos.ts` pueda devolver filas crudas.
export function toSprintInfo(s: Sprint): SprintInfo {
  return {
    id: s.id,
    nombre: s.nombre,
    estado: s.estado as EstadoSprint,
    fechaInicio: s.fechaInicio,
    fechaFin: s.fechaFin,
    orden: s.orden,
  };
}

export function toTareaCard(t: Tarea): TareaCard {
  return {
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion,
    columna: t.columnaKanban as ColumnaTarea,
    orden: t.orden,
    sprintId: t.sprintId,
    origen: t.origen as OrigenTarea,
    githubIssueNumber: t.githubIssueNumber,
    githubIssueUrl: t.githubIssueUrl,
  };
}

export const COLUMNAS_TAREA: { key: ColumnaTarea; label: string; dot: string }[] = [
  { key: "por_hacer", label: "Por hacer", dot: "bg-slate-400" },
  { key: "en_progreso", label: "En progreso", dot: "bg-brand-500" },
  { key: "revision", label: "Revisión", dot: "bg-amber-400" },
  { key: "hecho", label: "Hecho", dot: "bg-green-500" },
];

// Prefijo usado para distinguir, en onDragEnd, un issue del pool de GitHub
// (todavía sin fila en `tareas`) de una tarea ya existente (id uuid).
export const GH_DRAG_PREFIX = "gh-";
