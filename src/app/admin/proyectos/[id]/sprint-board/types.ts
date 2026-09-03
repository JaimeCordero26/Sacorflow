export type ColumnaTarea = "por_hacer" | "en_progreso" | "revision" | "hecho";
export type EstadoSprint = "planificado" | "activo" | "cerrado";
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

export interface GithubIssueLite {
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
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
