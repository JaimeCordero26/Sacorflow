import { getDb } from "@/db";
import { newId } from "@/lib/ids";
import {
  deleteBugById,
  insertBug,
  listBugs,
  listProjectOptions,
  updateBugFields,
  type ProjectOption,
} from "@/server/models/bug.model";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, type Bug, type Priority, type Status } from "@/entities/bug/model/types";

export interface BugsPageData {
  bugs: Bug[];
  projects: ProjectOption[];
}

export async function getBugsPageData(): Promise<BugsPageData> {
  const db = getDb();
  const [bugList, projects] = await Promise.all([listBugs(db), listProjectOptions(db)]);
  return { bugs: bugList, projects };
}

export async function createBug(
  createdBy: string,
  data: { title: string; description: string | null; priority: string; projectId: string | null },
): Promise<void> {
  if (!data.title.trim()) return;
  const db = getDb();
  await insertBug(db, {
    id: newId(),
    title: data.title.trim(),
    description: data.description?.trim() || null,
    priority: isPriority(data.priority) ? data.priority : "media",
    projectId: data.projectId || null,
    createdBy,
  });
}

export async function updateBug(
  id: string,
  data: { status?: string; priority?: string },
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (data.priority && isPriority(data.priority)) set.prioridad = data.priority;
  if (data.status && isStatus(data.status)) {
    set.estado = data.status;
    set.resueltoEn = data.status === "resuelto" ? new Date().toISOString() : null;
  }
  if (Object.keys(set).length === 0) return;
  const db = getDb();
  await updateBugFields(db, id, set);
}

export async function deleteBug(id: string): Promise<void> {
  const db = getDb();
  await deleteBugById(db, id);
}

function isPriority(value: string): value is Priority {
  return (PRIORITY_OPTIONS as readonly string[]).includes(value);
}

function isStatus(value: string): value is Status {
  return (STATUS_OPTIONS as readonly string[]).includes(value);
}
