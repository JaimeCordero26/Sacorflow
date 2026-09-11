export interface Client {
  id: string;
  name: string;
  contact: string | null;
  notes: string | null;
}

export interface ClientListItem {
  id: string;
  name: string;
  contact: string | null;
  projectCount: number;
}

// `kanbanColumn`/`stage` mantienen los valores en español que guarda la
// columna de SQLite (ver nota en entities/bug/model/types.ts).
export interface ClientProjectSummary {
  id: string;
  name: string;
  kanbanColumn: string;
  stage: string | null;
  progressPct: number;
  active: boolean;
  createdAt: string;
}
