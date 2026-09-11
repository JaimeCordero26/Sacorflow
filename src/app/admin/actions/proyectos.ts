"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import * as projectService from "@/server/services/project.service";
import type { GithubLinkData, KanbanColumn } from "@/entities/project/model/types";

export async function createProjectAction(formData: FormData) {
  const session = await requireSession();
  await projectService.createProject(session.uid, {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
  });
  revalidatePath("/admin/kanban");
}

export async function deleteProjectAction(projectId: string) {
  await requireSession();
  await projectService.deleteProject(projectId);
  revalidatePath("/admin/kanban");
  revalidatePath("/admin");
}

export async function moveProjectCardAction(
  projectId: string,
  column: KanbanColumn,
  order: number,
) {
  await requireSession();
  await projectService.moveProjectCard(projectId, column, order);
  revalidatePath("/admin/kanban");
}

export async function addIdeaCommentAction(projectId: string, text: string) {
  const session = await requireSession();
  await projectService.addIdeaComment(session.uid, projectId, text);
  revalidatePath(`/admin/proyectos/${projectId}`);
  revalidatePath("/admin/kanban");
}

export async function linkGithubRepoAction(projectId: string, data: GithubLinkData) {
  await requireSession();
  await projectService.linkGithubRepo(projectId, data);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function refreshProjectProgressAction(projectId: string) {
  await requireSession();
  await projectService.refreshProjectProgress(projectId);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function updateStageAction(projectId: string, stage: string) {
  await requireSession();
  await projectService.updateStage(projectId, stage);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function setProjectActiveAction(projectId: string, active: boolean) {
  await requireSession();
  await projectService.setProjectActive(projectId, active);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function markClientMessagesAsReadAction(projectId: string) {
  await requireSession();
  await projectService.markClientMessagesAsRead(projectId);
  revalidatePath("/admin");
  revalidatePath(`/admin/proyectos/${projectId}`);
}
