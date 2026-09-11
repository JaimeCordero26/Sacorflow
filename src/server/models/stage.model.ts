import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { etapas } from "@/db/schema";
import type { Stage } from "@/entities/stage/model/types";

export async function listStages(db: ReturnType<typeof getDb>): Promise<Stage[]> {
  const rows = await db.select().from(etapas).orderBy(asc(etapas.orden)).all();
  return rows.map((r) => ({ id: r.id, name: r.nombre, order: r.orden }));
}

export async function insertStage(
  db: ReturnType<typeof getDb>,
  data: { id: string; name: string; order: number },
): Promise<void> {
  await db.insert(etapas).values({ id: data.id, nombre: data.name, orden: data.order });
}

export async function deleteStageById(
  db: ReturnType<typeof getDb>,
  id: string,
): Promise<void> {
  await db.delete(etapas).where(eq(etapas.id, id));
}
