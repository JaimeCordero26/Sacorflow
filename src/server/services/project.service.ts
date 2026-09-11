import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { newId, newPublicToken } from "@/lib/ids";
import { computeProgress } from "@/lib/github-app";
import { getUserToken, progressWithToken } from "@/lib/github-oauth";
import {
  deleteProjectById,
  getKanbanColumnCounts,
  getProjectColumn,
  getProjectDetail as getProjectDetailModel,
  insertIdeaComment,
  insertProgressEvent,
  insertProject,
  listInboxRows,
  listProjectCards,
  listProjectChatMessages,
  listProjectEvents,
  markClientMessagesAsRead as markClientMessagesAsReadModel,
  updateProjectActive,
  updateProjectColumn,
  updateProjectGithubLink,
  updateProjectProgress,
  updateProjectStage,
} from "@/server/models/project.model";
import {
  KANBAN_COLUMN_KEYS,
  type DashboardData,
  type GithubLinkData,
  type KanbanColumn,
  type ProgressEvent,
  type ProjectCard,
  type ProjectDetail,
} from "@/entities/project/model/types";

export async function getKanbanBoardData(): Promise<ProjectCard[]> {
  return listProjectCards(getDb());
}

export async function createProject(
  createdBy: string,
  data: { name: string; description: string | null },
): Promise<void> {
  if (!data.name.trim()) return;
  await insertProject(getDb(), {
    id: newId(),
    name: data.name.trim(),
    description: data.description?.trim() || null,
    publicToken: newPublicToken(),
    createdBy,
  });
}

export async function deleteProject(id: string): Promise<void> {
  await deleteProjectById(getDb(), id);
}

export async function moveProjectCard(
  id: string,
  column: KanbanColumn,
  order: number,
): Promise<void> {
  if (!KANBAN_COLUMN_KEYS.includes(column)) return;
  await updateProjectColumn(getDb(), id, column, order);
}

export async function addIdeaComment(
  authorId: string,
  projectId: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await insertIdeaComment(getDb(), { id: newId(), projectId, authorId, text: trimmed });
}

export async function getProjectDetail(id: string): Promise<ProjectDetail | null> {
  return getProjectDetailModel(getDb(), id);
}

export async function getProjectEvents(projectId: string): Promise<ProgressEvent[]> {
  return listProjectEvents(getDb(), projectId);
}

export async function getProjectChatHistory(projectId: string) {
  return listProjectChatMessages(getDb(), projectId);
}

export async function setProjectActive(id: string, active: boolean): Promise<void> {
  await updateProjectActive(getDb(), id, active);
}

export async function updateStage(projectId: string, stage: string): Promise<void> {
  const db = getDb();
  await updateProjectStage(db, projectId, stage);
  await insertProgressEvent(db, {
    id: newId(),
    projectId,
    type: "etapa",
    description: `El proyecto avanzó a la etapa: ${stage}.`,
  });
}

export async function markClientMessagesAsRead(projectId: string): Promise<void> {
  await markClientMessagesAsReadModel(getDb(), projectId);
}

export async function linkGithubRepo(projectId: string, data: GithubLinkData): Promise<void> {
  const db = getDb();
  // Only projects that are "en_progreso" may be linked to GitHub.
  const column = await getProjectColumn(db, projectId);
  if (column !== "en_progreso") return;

  await updateProjectGithubLink(db, projectId, data);
  await refreshProjectProgress(projectId);
}

export async function refreshProjectProgress(projectId: string): Promise<void> {
  const { env } = getCloudflareContext();
  const db = getDb();
  const project = await getProjectDetailModel(db, projectId);
  if (!project?.repoGithub) return;

  try {
    let result: { pct: number; closed: number; total: number } | null = null;

    // Preferir el user token del creador (repos creados por la app).
    const creatorToken = project.createdBy ? await getUserToken(env, project.createdBy) : null;
    if (creatorToken) {
      result = await progressWithToken(creatorToken, project.repoGithub);
    } else if (project.installationId) {
      // Fallback: GitHub App (repos vinculados a mano).
      result = await computeProgress(env, {
        installationId: project.installationId,
        repo: project.repoGithub,
        milestoneId: project.milestoneId,
      });
    }
    if (!result) return;

    await updateProjectProgress(db, projectId, result.pct);
    await insertProgressEvent(db, {
      id: newId(),
      projectId,
      type: "progreso",
      description: `Progreso actualizado: ${result.closed} de ${result.total} tareas completadas (${result.pct}%).`,
      progressPct: result.pct,
    });
  } catch (e) {
    console.error("[refreshProjectProgress]", e);
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const db = getDb();
  const [columnCounts, inbox] = await Promise.all([
    getKanbanColumnCounts(db),
    listInboxRows(db),
  ]);
  return { columnCounts, inbox };
}
