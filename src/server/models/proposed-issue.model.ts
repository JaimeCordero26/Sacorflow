import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ideasComentarios, issuesPropuestos, tareas, usuarios } from "@/db/schema";
import type { ProposalStatus, ProposedIssue } from "@/entities/proposed-issue/model/types";

function toProposedIssue(row: typeof issuesPropuestos.$inferSelect): ProposedIssue {
  return {
    id: row.id,
    title: row.titulo,
    body: row.cuerpo,
    status: row.estado as ProposalStatus,
    githubIssueNumber: row.githubIssueNumber,
    githubIssueUrl: row.githubIssueUrl,
  };
}

export async function listProposedIssues(
  db: ReturnType<typeof getDb>,
  projectId: string,
): Promise<ProposedIssue[]> {
  const rows = await db
    .select()
    .from(issuesPropuestos)
    .where(eq(issuesPropuestos.proyectoId, projectId))
    .orderBy(asc(issuesPropuestos.creadoEn))
    .all();
  return rows.map(toProposedIssue);
}

export async function listProjectIdeaComments(
  db: ReturnType<typeof getDb>,
  projectId: string,
): Promise<{ author: string; text: string }[]> {
  const rows = await db
    .select({ texto: ideasComentarios.texto, autor: usuarios.nombre })
    .from(ideasComentarios)
    .leftJoin(usuarios, eq(usuarios.id, ideasComentarios.autorId))
    .where(eq(ideasComentarios.proyectoId, projectId))
    .all();
  return rows.map((r) => ({ author: r.autor ?? "Socio", text: r.texto }));
}

export async function replacePendingProposals(
  db: ReturnType<typeof getDb>,
  projectId: string,
  proposals: { id: string; title: string; body: string }[],
): Promise<void> {
  // Reemplaza las propuestas pendientes previas (conserva aceptadas/creadas).
  await db
    .delete(issuesPropuestos)
    .where(and(eq(issuesPropuestos.proyectoId, projectId), eq(issuesPropuestos.estado, "propuesto")));

  for (const p of proposals) {
    await db.insert(issuesPropuestos).values({
      id: p.id,
      proyectoId: projectId,
      titulo: p.title,
      cuerpo: p.body,
      origen: "ia",
      estado: "propuesto",
    });
  }
}

export async function getProposalProjectId(
  db: ReturnType<typeof getDb>,
  id: string,
): Promise<string | null> {
  const row = await db
    .select({ proyectoId: issuesPropuestos.proyectoId })
    .from(issuesPropuestos)
    .where(eq(issuesPropuestos.id, id))
    .get();
  return row?.proyectoId ?? null;
}

export async function updateProposalStatus(
  db: ReturnType<typeof getDb>,
  id: string,
  status: ProposalStatus,
): Promise<void> {
  await db.update(issuesPropuestos).set({ estado: status }).where(eq(issuesPropuestos.id, id));
}

export async function listAcceptedProposalsWithoutIssue(
  db: ReturnType<typeof getDb>,
  projectId: string,
): Promise<ProposedIssue[]> {
  const rows = await db
    .select()
    .from(issuesPropuestos)
    .where(and(eq(issuesPropuestos.proyectoId, projectId), eq(issuesPropuestos.estado, "aceptado")))
    .all();
  return rows.map(toProposedIssue);
}

export async function markProposalIssueCreated(
  db: ReturnType<typeof getDb>,
  id: string,
  data: { githubIssueNumber: number; githubIssueUrl: string },
): Promise<void> {
  await db
    .update(issuesPropuestos)
    .set({ githubIssueNumber: data.githubIssueNumber, githubIssueUrl: data.githubIssueUrl })
    .where(eq(issuesPropuestos.id, id));
}

export async function insertTaskFromIssue(
  db: ReturnType<typeof getDb>,
  data: {
    id: string;
    projectId: string;
    title: string;
    githubIssueNumber: number;
    githubIssueUrl: string;
    createdBy: string;
  },
): Promise<void> {
  // También aparece como tarea en el tablero de sprints/backlog del proyecto.
  await db.insert(tareas).values({
    id: data.id,
    proyectoId: data.projectId,
    titulo: data.title,
    columnaKanban: "por_hacer",
    origen: "github_import",
    githubIssueNumber: data.githubIssueNumber,
    githubIssueUrl: data.githubIssueUrl,
    githubIssueState: "open",
    creadoPor: data.createdBy,
  });
}
