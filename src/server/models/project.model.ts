import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  eventosProgreso,
  githubCuentas,
  ideasComentarios,
  mensajesChat,
  proyectos,
  usuarios,
  type ColumnaKanban,
} from "@/db/schema";
import type {
  Author,
  GithubLinkData,
  InboxRow,
  KanbanColumn,
  ProgressEvent,
  ProjectCard,
  ProjectDetail,
} from "@/entities/project/model/types";
import type { ChatAuthorType, ChatMessage } from "@/entities/chat/model/types";

// Colores neón estables por socio (para distinguir quién dijo qué).
const AUTHOR_COLORS = ["#00f5ff", "#7c3aed", "#ec4899", "#22d3ee"];

export async function listProjectCards(
  db: ReturnType<typeof getDb>,
): Promise<ProjectCard[]> {
  const [projects, comments, users, accounts] = await Promise.all([
    db.select().from(proyectos).orderBy(asc(proyectos.orden)).all(),
    db.select().from(ideasComentarios).orderBy(asc(ideasComentarios.creadoEn)).all(),
    db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios).all(),
    db
      .select({
        usuarioId: githubCuentas.usuarioId,
        avatar: githubCuentas.avatarUrl,
      })
      .from(githubCuentas)
      .all(),
  ]);

  const userRank = new Map(users.map((u, i) => [u.id, i]));
  const avatarByUserId = new Map(accounts.map((a) => [a.usuarioId, a.avatar]));
  const resolveAuthor = (userId: string | null): Author => {
    if (!userId) return { name: "—", color: "#64748b", avatarUrl: null };
    const name = users.find((u) => u.id === userId)?.nombre ?? "—";
    const color = AUTHOR_COLORS[(userRank.get(userId) ?? 0) % AUTHOR_COLORS.length];
    return { name, color, avatarUrl: avatarByUserId.get(userId) ?? null };
  };

  return projects.map((p) => ({
    id: p.id,
    name: p.nombre,
    description: p.descripcion,
    kanbanColumn: p.columnaKanban as KanbanColumn,
    order: p.orden,
    author: resolveAuthor(p.creadoPor),
    hasRepo: !!p.repoGithub,
    createdAt: p.creadoEn,
    comments: comments
      .filter((c) => c.proyectoId === p.id)
      .map((c) => ({
        id: c.id,
        text: c.texto,
        author: resolveAuthor(c.autorId),
        createdAt: c.creadoEn,
      })),
  }));
}

export async function insertProject(
  db: ReturnType<typeof getDb>,
  data: {
    id: string;
    name: string;
    description: string | null;
    publicToken: string;
    createdBy: string;
  },
): Promise<void> {
  await db.insert(proyectos).values({
    id: data.id,
    nombre: data.name,
    descripcion: data.description,
    columnaKanban: "idea",
    tokenPublico: data.publicToken,
    creadoPor: data.createdBy,
  });
}

export async function deleteProjectById(
  db: ReturnType<typeof getDb>,
  id: string,
): Promise<void> {
  // Los hijos (comentarios, issues, eventos, mensajes, pivote cliente) tienen
  // onDelete: "cascade" en el schema, así que se borran solos.
  await db.delete(proyectos).where(eq(proyectos.id, id));
}

export async function updateProjectColumn(
  db: ReturnType<typeof getDb>,
  id: string,
  column: KanbanColumn,
  order: number,
): Promise<void> {
  await db.update(proyectos).set({ columnaKanban: column, orden: order }).where(eq(proyectos.id, id));
}

export async function insertIdeaComment(
  db: ReturnType<typeof getDb>,
  data: { id: string; projectId: string; authorId: string; text: string },
): Promise<void> {
  await db.insert(ideasComentarios).values({
    id: data.id,
    proyectoId: data.projectId,
    autorId: data.authorId,
    texto: data.text,
  });
}

export async function getProjectDetail(
  db: ReturnType<typeof getDb>,
  id: string,
): Promise<ProjectDetail | null> {
  const row = await db.select().from(proyectos).where(eq(proyectos.id, id)).get();
  if (!row) return null;

  const creatorAccount = row.creadoPor
    ? await db
        .select({ login: githubCuentas.githubLogin })
        .from(githubCuentas)
        .where(eq(githubCuentas.usuarioId, row.creadoPor))
        .get()
    : undefined;

  return {
    id: row.id,
    name: row.nombre,
    description: row.descripcion,
    active: row.activo,
    publicToken: row.tokenPublico,
    progressPct: row.progresoPct,
    stage: row.etapaActual,
    repoGithub: row.repoGithub,
    installationId: row.installationId,
    milestoneId: row.milestoneId,
    milestoneTitle: row.milestoneTitulo,
    createdBy: row.creadoPor,
    creatorGithubLogin: creatorAccount?.login ?? null,
  };
}

export async function getProjectDetailByPublicToken(
  db: ReturnType<typeof getDb>,
  token: string,
): Promise<ProjectDetail | null> {
  const row = await db.select().from(proyectos).where(eq(proyectos.tokenPublico, token)).get();
  if (!row) return null;
  return getProjectDetail(db, row.id);
}

export async function listProjectEvents(
  db: ReturnType<typeof getDb>,
  projectId: string,
): Promise<ProgressEvent[]> {
  const rows = await db
    .select()
    .from(eventosProgreso)
    .where(eq(eventosProgreso.proyectoId, projectId))
    .orderBy(desc(eventosProgreso.creadoEn))
    .all();
  return rows.map((r) => ({
    id: r.id,
    type: r.tipo,
    description: r.descripcion,
    progressPct: r.progresoPct,
    createdAt: r.creadoEn,
  }));
}

export async function insertProgressEvent(
  db: ReturnType<typeof getDb>,
  data: { id: string; projectId: string; type: string; description: string; progressPct?: number | null },
): Promise<void> {
  await db.insert(eventosProgreso).values({
    id: data.id,
    proyectoId: data.projectId,
    tipo: data.type,
    descripcion: data.description,
    progresoPct: data.progressPct ?? null,
  });
}

export async function updateProjectActive(
  db: ReturnType<typeof getDb>,
  id: string,
  active: boolean,
): Promise<void> {
  await db.update(proyectos).set({ activo: active }).where(eq(proyectos.id, id));
}

export async function updateProjectStage(
  db: ReturnType<typeof getDb>,
  id: string,
  stage: string,
): Promise<void> {
  await db.update(proyectos).set({ etapaActual: stage }).where(eq(proyectos.id, id));
}

export async function updateProjectProgress(
  db: ReturnType<typeof getDb>,
  id: string,
  progressPct: number,
): Promise<void> {
  await db.update(proyectos).set({ progresoPct: progressPct }).where(eq(proyectos.id, id));
}

export async function getProjectColumn(
  db: ReturnType<typeof getDb>,
  id: string,
): Promise<ColumnaKanban | null> {
  const row = await db
    .select({ columna: proyectos.columnaKanban })
    .from(proyectos)
    .where(eq(proyectos.id, id))
    .get();
  return (row?.columna as ColumnaKanban | undefined) ?? null;
}

export async function updateProjectRepo(
  db: ReturnType<typeof getDb>,
  id: string,
  repoGithub: string,
): Promise<void> {
  await db.update(proyectos).set({ repoGithub }).where(eq(proyectos.id, id));
}

export async function updateProjectGithubLink(
  db: ReturnType<typeof getDb>,
  id: string,
  data: GithubLinkData,
): Promise<void> {
  await db
    .update(proyectos)
    .set({
      repoGithub: data.repoGithub.trim(),
      installationId: data.installationId,
      milestoneId: data.milestoneId ?? null,
      milestoneTitulo: data.milestoneTitle ?? null,
    })
    .where(eq(proyectos.id, id));
}

export async function markClientMessagesAsRead(
  db: ReturnType<typeof getDb>,
  projectId: string,
): Promise<void> {
  await db
    .update(mensajesChat)
    .set({ leido: true })
    .where(and(eq(mensajesChat.proyectoId, projectId), eq(mensajesChat.autorTipo, "cliente")));
}

export async function listProjectChatMessages(
  db: ReturnType<typeof getDb>,
  projectId: string,
): Promise<ChatMessage[]> {
  const rows = await db
    .select()
    .from(mensajesChat)
    .where(eq(mensajesChat.proyectoId, projectId))
    .orderBy(asc(mensajesChat.creadoEn))
    .all();
  return rows.map((r) => ({
    id: r.id,
    authorType: r.autorTipo as ChatAuthorType,
    authorName: r.autorNombre,
    text: r.texto,
    createdAt: r.creadoEn,
  }));
}

export async function getKanbanColumnCounts(
  db: ReturnType<typeof getDb>,
): Promise<Record<string, number>> {
  const rows = await db
    .select({ columna: proyectos.columnaKanban, n: sql<number>`count(*)` })
    .from(proyectos)
    .groupBy(proyectos.columnaKanban)
    .all();
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.columna] = r.n;
  return counts;
}

export async function listInboxRows(db: ReturnType<typeof getDb>): Promise<InboxRow[]> {
  const rows = await db
    .select({
      id: proyectos.id,
      nombre: proyectos.nombre,
      activo: proyectos.activo,
      noLeidos: sql<number>`sum(case when ${mensajesChat.autorTipo} = 'cliente' and ${mensajesChat.leido} = 0 then 1 else 0 end)`,
      ultimaActividad: sql<string>`max(${mensajesChat.creadoEn})`,
      ultimoTexto: sql<string>`(select texto from mensajes_chat m2 where m2.proyecto_id = ${proyectos.id} order by m2.creado_en desc limit 1)`,
    })
    .from(proyectos)
    .innerJoin(mensajesChat, eq(mensajesChat.proyectoId, proyectos.id))
    .groupBy(proyectos.id)
    .orderBy(desc(sql`max(${mensajesChat.creadoEn})`))
    .all();

  return rows.map((r) => ({
    id: r.id,
    name: r.nombre,
    active: r.activo,
    unreadCount: r.noLeidos ?? 0,
    lastActivityAt: r.ultimaActividad ?? null,
    lastMessageText: r.ultimoTexto ?? null,
  }));
}
