import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { newId } from "@/lib/ids";
import {
  createIssue,
  getIssueDetail as fetchIssueDetail,
  getUserToken,
  listIssueComments,
  listIssues,
  type GithubIssueComment,
  type GithubIssueDetail,
  type GithubIssueLite,
} from "@/lib/github-oauth";
import { getProjectDetail } from "@/server/models/project.model";
import {
  countSprintsForProject,
  deleteSprintById,
  deleteTaskById,
  insertSprint,
  insertTask,
  listImportedGithubIssueNumbers,
  listSprintsForProject,
  listTasksForProject,
  updateSprintStatus,
  updateTaskColumn,
  updateTaskSprint,
} from "@/server/models/sprint.model";
import { TASK_COLUMN_KEYS, type Task, type TaskColumn, type TaskOrigin } from "@/entities/task/model/types";
import type { Sprint } from "@/entities/sprint/model/types";

export interface SprintBoardData {
  sprints: Sprint[];
  tasks: Task[];
}

export async function getSprintBoardData(projectId: string): Promise<SprintBoardData> {
  const db = getDb();
  const [sprintList, taskList] = await Promise.all([
    listSprintsForProject(db, projectId),
    listTasksForProject(db, projectId),
  ]);
  return { sprints: sprintList, tasks: taskList };
}

export async function createSprint(
  projectId: string,
  name: string,
  startDate?: string,
  endDate?: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const db = getDb();
  const order = await countSprintsForProject(db, projectId);
  await insertSprint(db, {
    id: newId(),
    projectId,
    name: trimmed,
    startDate: startDate || null,
    endDate: endDate || null,
    order,
  });
}

export async function startSprint(id: string): Promise<void> {
  await updateSprintStatus(getDb(), id, "activo");
}

export async function closeSprint(id: string): Promise<void> {
  await updateSprintStatus(getDb(), id, "cerrado", new Date().toISOString());
}

export async function deleteSprint(id: string): Promise<void> {
  await deleteSprintById(getDb(), id);
}

export async function createTask(
  userId: string,
  projectId: string,
  sprintId: string | null,
  title: string,
  description?: string,
): Promise<void> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return;
  const db = getDb();

  // Si el proyecto tiene repo vinculado y el creador conectó GitHub, la tarea
  // nace también como issue real (no solo como fila local) para que se vea y
  // se pueda seguir igual que un issue importado.
  let githubIssueNumber: number | null = null;
  let githubIssueUrl: string | null = null;
  let githubIssueState: "open" | null = null;

  const project = await getProjectDetail(db, projectId);
  if (project?.repoGithub && project.createdBy) {
    const { env } = getCloudflareContext();
    const token = await getUserToken(env, project.createdBy);
    if (token) {
      try {
        const issue = await createIssue(token, project.repoGithub, {
          title: trimmedTitle,
          body: description?.trim() || "",
        });
        githubIssueNumber = issue.number;
        githubIssueUrl = issue.html_url;
        githubIssueState = "open";
      } catch (e) {
        console.error("[createTask] no se pudo crear el issue en GitHub", e);
      }
    }
  }

  await insertTask(db, {
    id: newId(),
    projectId,
    sprintId,
    title: trimmedTitle,
    description: description?.trim() || null,
    origin: "manual",
    githubIssueNumber,
    githubIssueUrl,
    githubIssueState,
    createdBy: userId,
  });
}

export async function moveTask(id: string, column: TaskColumn, order: number): Promise<void> {
  if (!TASK_COLUMN_KEYS.includes(column)) return;
  await updateTaskColumn(getDb(), id, column, order);
}

export async function moveTaskToSprint(id: string, sprintId: string | null): Promise<void> {
  await updateTaskSprint(getDb(), id, sprintId);
}

export async function deleteTask(id: string): Promise<void> {
  await deleteTaskById(getDb(), id);
}

export async function importIssueAsTask(
  userId: string,
  projectId: string,
  sprintId: string | null,
  initialColumn: TaskColumn,
  issue: { number: number; title: string; url: string },
): Promise<void> {
  if (!TASK_COLUMN_KEYS.includes(initialColumn)) return;
  const db = getDb();
  await insertTask(db, {
    id: newId(),
    projectId,
    sprintId,
    title: issue.title,
    description: null,
    column: initialColumn,
    origin: "github_import" as TaskOrigin,
    githubIssueNumber: issue.number,
    githubIssueUrl: issue.url,
    githubIssueState: "open",
    createdBy: userId,
  });
}

export async function listAvailableGithubIssues(
  projectId: string,
): Promise<{ ok: boolean; issues?: GithubIssueLite[]; error?: string }> {
  const { env } = getCloudflareContext();
  const db = getDb();

  const project = await getProjectDetail(db, projectId);
  if (!project?.repoGithub) return { ok: false, error: "El proyecto no tiene repo vinculado." };

  const token = project.createdBy ? await getUserToken(env, project.createdBy) : null;
  if (!token) return { ok: false, error: "El creador del proyecto no tiene GitHub conectado." };

  try {
    const open = await listIssues(token, project.repoGithub, { state: "open" });
    const usedNumbers = await listImportedGithubIssueNumbers(db, projectId);
    return { ok: true, issues: open.filter((i) => !usedNumbers.has(i.number)) };
  } catch (e) {
    console.error("[listAvailableGithubIssues]", e);
    return { ok: false, error: "No se pudieron cargar los issues de GitHub." };
  }
}

// Detalle de un issue puntual (body, labels, asignados, comentarios) para
// mostrarlo dentro del tablero sin salir a GitHub.
export async function getTaskIssueDetail(
  projectId: string,
  issueNumber: number,
): Promise<{
  ok: boolean;
  detail?: GithubIssueDetail;
  comments?: GithubIssueComment[];
  error?: string;
}> {
  const { env } = getCloudflareContext();
  const db = getDb();

  const project = await getProjectDetail(db, projectId);
  if (!project?.repoGithub) return { ok: false, error: "El proyecto no tiene repo vinculado." };

  const token = project.createdBy ? await getUserToken(env, project.createdBy) : null;
  if (!token) return { ok: false, error: "El creador del proyecto no tiene GitHub conectado." };

  try {
    const [detail, comments] = await Promise.all([
      fetchIssueDetail(token, project.repoGithub, issueNumber),
      listIssueComments(token, project.repoGithub, issueNumber),
    ]);
    return { ok: true, detail, comments };
  } catch (e) {
    console.error("[getTaskIssueDetail]", e);
    return { ok: false, error: "No se pudo cargar el detalle del issue." };
  }
}
