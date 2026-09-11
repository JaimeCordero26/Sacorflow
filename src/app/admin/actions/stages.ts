"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import * as stageService from "@/server/services/stage.service";

export async function createStageAction(name: string, order: number) {
  await requireSession();
  await stageService.createStage(name, order);
  revalidatePath("/admin/proyectos", "layout");
}

export async function deleteStageAction(id: string) {
  await requireSession();
  await stageService.deleteStage(id);
  revalidatePath("/admin/proyectos", "layout");
}
