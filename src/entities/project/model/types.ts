// Los valores de columna ("idea", "en_progreso", ...) son los que guarda la
// columna `columna_kanban` de SQLite — no se traducen para evitar una
// migración de datos (ver nota en entities/bug/model/types.ts).
export type KanbanColumn =
  | "idea"
  | "en_progreso"
  | "listo"
  | "pausado"
  | "cancelado"
  | "entregado"
  | "cerrado";

export interface Author {
  name: string;
  color: string;
  avatarUrl: string | null;
}

export interface IdeaComment {
  id: string;
  text: string;
  author: Author;
  createdAt: string;
}

export interface ProjectCard {
  id: string;
  name: string;
  description: string | null;
  kanbanColumn: KanbanColumn;
  order: number;
  author: Author;
  hasRepo: boolean;
  createdAt: string;
  comments: IdeaComment[];
}

export const KANBAN_COLUMNS: { key: KanbanColumn; label: string; dot: string }[] = [
  { key: "idea", label: "Ideas", dot: "bg-brand-500" },
  { key: "en_progreso", label: "En progreso", dot: "bg-violet-500" },
  { key: "listo", label: "Listos", dot: "bg-pink-500" },
  { key: "pausado", label: "Pausado", dot: "bg-slate-500" },
  { key: "cancelado", label: "Cancelado", dot: "bg-red-500" },
  { key: "entregado", label: "Entregado", dot: "bg-green-500" },
  { key: "cerrado", label: "Cerrado", dot: "bg-gray-500" },
];

export const KANBAN_COLUMN_KEYS: KanbanColumn[] = KANBAN_COLUMNS.map((c) => c.key);

export interface ProgressEvent {
  id: string;
  type: string;
  description: string;
  progressPct: number | null;
  createdAt: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  publicToken: string;
  progressPct: number;
  stage: string | null;
  repoGithub: string | null;
  installationId: number | null;
  milestoneId: number | null;
  milestoneTitle: string | null;
  createdBy: string | null;
  creatorGithubLogin: string | null;
}

export interface InboxRow {
  id: string;
  name: string;
  active: boolean;
  unreadCount: number;
  lastActivityAt: string | null;
  lastMessageText: string | null;
}

export interface DashboardData {
  columnCounts: Record<string, number>;
  inbox: InboxRow[];
}

export interface GithubLinkData {
  repoGithub: string;
  installationId: number | null;
  milestoneId?: number | null;
  milestoneTitle?: string | null;
}
