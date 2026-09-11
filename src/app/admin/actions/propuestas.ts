"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import * as proposedIssueService from "@/server/services/proposed-issue.service";
import type { ProposalStatus } from "@/entities/proposed-issue/model/types";

export async function generateProposalsAction(
  projectId: string,
): Promise<{ ok: boolean; n?: number; error?: string }> {
  await requireSession();
  const res = await proposedIssueService.generateProposals(projectId);
  revalidatePath(`/admin/proyectos/${projectId}`);
  return { ok: res.ok, n: res.count, error: res.error };
}

export async function markProposalAction(id: string, status: ProposalStatus) {
  await requireSession();
  const { projectId } = await proposedIssueService.markProposal(id, status);
  if (projectId) revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function createAcceptedIssuesAction(
  projectId: string,
): Promise<{ ok: boolean; creados?: number; error?: string }> {
  await requireSession();
  const res = await proposedIssueService.createAcceptedIssues(projectId);
  revalidatePath(`/admin/proyectos/${projectId}`);
  return { ok: res.ok, creados: res.created, error: res.error };
}
