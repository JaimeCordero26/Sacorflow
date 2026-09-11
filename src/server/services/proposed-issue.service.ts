import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { newId } from "@/lib/ids";
import { suggestIssuesForIdea } from "@/lib/ai";
import { createIssue, getUserToken } from "@/lib/github-oauth";
import { getProjectDetail } from "@/server/models/project.model";
import {
  getProposalProjectId,
  insertTaskFromIssue,
  listAcceptedProposalsWithoutIssue,
  listProjectIdeaComments,
  listProposedIssues,
  markProposalIssueCreated,
  replacePendingProposals,
  updateProposalStatus,
} from "@/server/models/proposed-issue.model";
import type { ProposalStatus, ProposedIssue } from "@/entities/proposed-issue/model/types";

export async function getProposedIssues(projectId: string): Promise<ProposedIssue[]> {
  return listProposedIssues(getDb(), projectId);
}

export async function generateProposals(
  projectId: string,
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const { env } = getCloudflareContext();
  const db = getDb();

  const project = await getProjectDetail(db, projectId);
  if (!project) return { ok: false, error: "Proyecto no encontrado" };

  const comments = await listProjectIdeaComments(db, projectId);

  let suggested;
  try {
    suggested = await suggestIssuesForIdea(env, {
      title: project.name,
      description: project.description,
      comments,
    });
  } catch (e) {
    console.error("[generateProposals] AI", e);
    return { ok: false, error: "La IA no pudo procesar la idea" };
  }
  if (suggested.length === 0)
    return { ok: false, error: "La IA no devolvió propuestas válidas" };

  await replacePendingProposals(
    db,
    projectId,
    suggested.map((s) => ({ id: newId(), title: s.title, body: s.body })),
  );

  return { ok: true, count: suggested.length };
}

export async function markProposal(
  id: string,
  status: ProposalStatus,
): Promise<{ projectId: string | null }> {
  const db = getDb();
  const projectId = await getProposalProjectId(db, id);
  await updateProposalStatus(db, id, status);
  return { projectId };
}

export async function createAcceptedIssues(
  projectId: string,
): Promise<{ ok: boolean; created?: number; error?: string }> {
  const { env } = getCloudflareContext();
  const db = getDb();

  const project = await getProjectDetail(db, projectId);
  if (!project?.repoGithub) return { ok: false, error: "Primero crea el repositorio" };
  if (!project.createdBy) return { ok: false, error: "Idea sin creador" };

  const token = await getUserToken(env, project.createdBy);
  if (!token) return { ok: false, error: "El creador debe conectar su GitHub" };

  const pending = await listAcceptedProposalsWithoutIssue(db, projectId);

  let created = 0;
  for (const p of pending) {
    if (p.githubIssueNumber) continue;
    try {
      const issue = await createIssue(token, project.repoGithub, {
        title: p.title,
        body: p.body,
      });
      await markProposalIssueCreated(db, p.id, {
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.html_url,
      });
      await insertTaskFromIssue(db, {
        id: newId(),
        projectId,
        title: p.title,
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.html_url,
        createdBy: project.createdBy,
      });
      created++;
    } catch (e) {
      console.error("[createAcceptedIssues]", e);
    }
  }

  return { ok: true, created };
}
