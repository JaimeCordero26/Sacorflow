import { getDb } from "@/db";
import { newId } from "@/lib/ids";
import { deleteStageById, insertStage, listStages } from "@/server/models/stage.model";
import type { Stage } from "@/entities/stage/model/types";

export async function getStages(): Promise<Stage[]> {
  return listStages(getDb());
}

export async function createStage(name: string, order: number): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  await insertStage(getDb(), { id: newId(), name: trimmed, order });
}

export async function deleteStage(id: string): Promise<void> {
  await deleteStageById(getDb(), id);
}
