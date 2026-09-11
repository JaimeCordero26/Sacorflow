"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bugs } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { newId } from "@/lib/ids";

const PRIORIDADES = ["alta", "media", "baja"] as const;
const ESTADOS_BUG = ["abierto", "en_progreso", "resuelto"] as const;

export async function crearBug(formData: FormData) {
  const session = await requireSession();
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;
  const prioridad = String(formData.get("prioridad") ?? "media");
  const proyectoId = String(formData.get("proyectoId") ?? "").trim();
  const db = getDb();
  await db.insert(bugs).values({
    id: newId(),
    titulo,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    prioridad: (PRIORIDADES as readonly string[]).includes(prioridad)
      ? prioridad
      : "media",
    estado: "abierto",
    proyectoId: proyectoId || null,
    creadoPor: session.uid,
  });
  revalidatePath("/admin/bugs");
  revalidatePath("/admin");
}

export async function actualizarBug(
  id: string,
  data: { estado?: string; prioridad?: string },
) {
  await requireSession();
  const set: Record<string, unknown> = {};
  if (data.prioridad && (PRIORIDADES as readonly string[]).includes(data.prioridad))
    set.prioridad = data.prioridad;
  if (data.estado && (ESTADOS_BUG as readonly string[]).includes(data.estado)) {
    set.estado = data.estado;
    set.resueltoEn = data.estado === "resuelto" ? new Date().toISOString() : null;
  }
  if (Object.keys(set).length === 0) return;
  const db = getDb();
  await db.update(bugs).set(set).where(eq(bugs.id, id));
  revalidatePath("/admin/bugs");
}

export async function eliminarBug(id: string) {
  await requireSession();
  const db = getDb();
  await db.delete(bugs).where(eq(bugs.id, id));
  revalidatePath("/admin/bugs");
}
