export type Columna =
  | "idea"
  | "en_progreso"
  | "listo"
  | "pausado"
  | "cancelado"
  | "entregado"
  | "cerrado";

export interface Autor {
  nombre: string;
  color: string;
  avatar: string | null;
}

export interface KanbanCard {
  id: string;
  nombre: string;
  descripcion: string | null;
  columna: Columna;
  orden: number;
  autor: Autor;
  tieneRepo: boolean;
  creadoEn: string;
  comentarios: { id: string; texto: string; autor: Autor; creadoEn: string }[];
}

export const COLUMNS: { key: Columna; label: string; dot: string }[] = [
  { key: "idea", label: "Ideas", dot: "bg-brand-500" },
  { key: "en_progreso", label: "En progreso", dot: "bg-violet-500" },
  { key: "listo", label: "Listos", dot: "bg-pink-500" },
  { key: "pausado", label: "Pausado", dot: "bg-slate-500" },
  { key: "cancelado", label: "Cancelado", dot: "bg-red-500" },
  { key: "entregado", label: "Entregado", dot: "bg-green-500" },
  { key: "cerrado", label: "Cerrado", dot: "bg-gray-500" },
];
