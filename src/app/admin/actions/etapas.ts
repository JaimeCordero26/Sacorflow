"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { etapas } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { newId } from "@/lib/ids";

export async function crearEtapa(nombre: string, orden: number) {
  await requireSession();
  const n = nombre.trim();
  if (!n) return;
  const db = getDb();
  await db.insert(etapas).values({ id: newId(), nombre: n, orden });
  revalidatePath("/admin/proyectos", "layout");
}

export async function eliminarEtapa(id: string) {
  await requireSession();
  const db = getDb();
  await db.delete(etapas).where(eq(etapas.id, id));
  revalidatePath("/admin/proyectos", "layout");
}
