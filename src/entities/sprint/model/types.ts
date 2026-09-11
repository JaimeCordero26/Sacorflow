export type SprintStatus = "planificado" | "activo" | "cerrado";

export interface Sprint {
  id: string;
  name: string;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  order: number;
}
