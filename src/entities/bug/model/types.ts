// Los valores literales ("alta", "abierto", ...) son los que se guardan tal
// cual en la columna de SQLite — traducirlos requeriría una migración de
// datos en producción, igual que con el esquema (ver github-account.model.ts).
export type Priority = "alta" | "media" | "baja";
export type Status = "abierto" | "en_progreso" | "resuelto";

export interface Bug {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  projectId: string | null;
  projectName: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export const PRIORITY_META: Record<Priority, { label: string; cls: string; rank: number }> = {
  alta: { label: "Alta", cls: "border-pink-500/40 bg-pink-500/15 text-pink-300", rank: 0 },
  media: { label: "Media", cls: "border-amber-500/40 bg-amber-500/15 text-amber-300", rank: 1 },
  baja: { label: "Baja", cls: "border-slate-500/40 bg-slate-500/15 text-slate-300", rank: 2 },
};

export const STATUS_META: Record<Status, { label: string; rank: number }> = {
  abierto: { label: "Abierto", rank: 0 },
  en_progreso: { label: "En progreso", rank: 1 },
  resuelto: { label: "Resuelto", rank: 2 },
};

// Listas usadas para generar los <option> de prioridad/estado — un solo lugar
// en vez de escribir las mismas opciones a mano en el form y en cada fila.
export const PRIORITY_OPTIONS: Priority[] = ["alta", "media", "baja"];
export const STATUS_OPTIONS: Status[] = ["abierto", "en_progreso", "resuelto"];
