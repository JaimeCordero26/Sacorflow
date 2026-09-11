"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import * as bugService from "@/server/services/bug.service";
import type { Priority, Status } from "@/entities/bug/model/types";

export async function createBugAction(formData: FormData) {
  const session = await requireSession();
  await bugService.createBug(session.uid, {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    priority: String(formData.get("priority") ?? "media"),
    projectId: String(formData.get("projectId") ?? "").trim() || null,
  });
  revalidatePath("/admin/bugs");
  revalidatePath("/admin");
}

export async function updateBugAction(
  id: string,
  data: { status?: Status; priority?: Priority },
) {
  await requireSession();
  await bugService.updateBug(id, data);
  revalidatePath("/admin/bugs");
}

export async function deleteBugAction(id: string) {
  await requireSession();
  await bugService.deleteBug(id);
  revalidatePath("/admin/bugs");
}
