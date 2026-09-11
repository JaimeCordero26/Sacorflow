export type Prioridad = "alta" | "media" | "baja";
export type Estado = "abierto" | "en_progreso" | "resuelto";

export interface Bug {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  estado: Estado;
  proyectoId: string | null;
  proyectoNombre: string | null;
  creadoEn: string;
  resueltoEn: string | null;
}

export const PRIO_META: Record<Prioridad, { label: string; cls: string; rank: number }> = {
  alta: { label: "Alta", cls: "border-pink-500/40 bg-pink-500/15 text-pink-300", rank: 0 },
  media: { label: "Media", cls: "border-amber-500/40 bg-amber-500/15 text-amber-300", rank: 1 },
  baja: { label: "Baja", cls: "border-slate-500/40 bg-slate-500/15 text-slate-300", rank: 2 },
};

export const ESTADO_META: Record<Estado, { label: string; rank: number }> = {
  abierto: { label: "Abierto", rank: 0 },
  en_progreso: { label: "En progreso", rank: 1 },
  resuelto: { label: "Resuelto", rank: 2 },
};

// Listas usadas para generar los <option> de prioridad/estado — un solo lugar
// en vez de escribir las mismas opciones a mano en el form y en cada fila.
export const PRIORIDAD_OPTIONS: Prioridad[] = ["alta", "media", "baja"];
export const ESTADO_OPTIONS: Estado[] = ["abierto", "en_progreso", "resuelto"];
