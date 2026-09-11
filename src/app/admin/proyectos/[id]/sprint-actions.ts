"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import * as sprintService from "@/server/services/sprint.service";
import type { TaskColumn } from "@/entities/task/model/types";
import type { GithubIssueComment, GithubIssueDetail, GithubIssueLite } from "@/lib/github-oauth";

export type { GithubIssueComment, GithubIssueDetail, GithubIssueLite };

// ---------- Sprints ----------

export async function createSprintAction(
  projectId: string,
  name: string,
  startDate?: string,
  endDate?: string,
) {
  await requireSession();
  await sprintService.createSprint(projectId, name, startDate, endDate);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function startSprintAction(sprintId: string, projectId: string) {
  await requireSession();
  await sprintService.startSprint(sprintId);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function closeSprintAction(sprintId: string, projectId: string) {
  await requireSession();
  await sprintService.closeSprint(sprintId);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function deleteSprintAction(sprintId: string, projectId: string) {
  await requireSession();
  await sprintService.deleteSprint(sprintId);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

// ---------- Tareas ----------

export async function createTaskAction(
  projectId: string,
  sprintId: string | null,
  title: string,
  description?: string,
) {
  const session = await requireSession();
  await sprintService.createTask(session.uid, projectId, sprintId, title, description);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function moveTaskAction(
  taskId: string,
  projectId: string,
  column: TaskColumn,
  order: number,
) {
  await requireSession();
  await sprintService.moveTask(taskId, column, order);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function moveTaskToSprintAction(
  taskId: string,
  projectId: string,
  sprintId: string | null,
) {
  await requireSession();
  await sprintService.moveTaskToSprint(taskId, sprintId);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function deleteTaskAction(taskId: string, projectId: string) {
  await requireSession();
  await sprintService.deleteTask(taskId);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function importIssueAsTaskAction(
  projectId: string,
  sprintId: string | null,
  initialColumn: TaskColumn,
  issue: { number: number; title: string; url: string },
) {
  const session = await requireSession();
  await sprintService.importIssueAsTask(session.uid, projectId, sprintId, initialColumn, issue);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

// ---------- Pool de issues de GitHub ----------

export async function listAvailableGithubIssuesAction(
  projectId: string,
): Promise<{ ok: boolean; issues?: GithubIssueLite[]; error?: string }> {
  await requireSession();
  return sprintService.listAvailableGithubIssues(projectId);
}

export async function getTaskIssueDetailAction(
  projectId: string,
  issueNumber: number,
): Promise<{
  ok: boolean;
  detail?: GithubIssueDetail;
  comments?: GithubIssueComment[];
  error?: string;
}> {
  await requireSession();
  return sprintService.getTaskIssueDetail(projectId, issueNumber);
}
