"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clientes, proyectoClientes } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { newId } from "@/lib/ids";

export async function crearCliente(formData: FormData) {
  await requireSession();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  const db = getDb();
  await db.insert(clientes).values({
    id: newId(),
    nombre,
    contacto: String(formData.get("contacto") ?? "").trim() || null,
    notas: String(formData.get("notas") ?? "").trim() || null,
  });
  revalidatePath("/admin/clientes");
}

export async function actualizarCliente(id: string, formData: FormData) {
  await requireSession();
  const db = getDb();
  await db
    .update(clientes)
    .set({
      nombre: String(formData.get("nombre") ?? "").trim(),
      contacto: String(formData.get("contacto") ?? "").trim() || null,
      notas: String(formData.get("notas") ?? "").trim() || null,
    })
    .where(eq(clientes.id, id));
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
}

export async function vincularClienteProyecto(
  clienteId: string,
  proyectoId: string,
) {
  await requireSession();
  const db = getDb();
  await db
    .insert(proyectoClientes)
    .values({ clienteId, proyectoId })
    .onConflictDoNothing();
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function desvincularClienteProyecto(
  clienteId: string,
  proyectoId: string,
) {
  await requireSession();
  const db = getDb();
  await db
    .delete(proyectoClientes)
    .where(
      and(
        eq(proyectoClientes.clienteId, clienteId),
        eq(proyectoClientes.proyectoId, proyectoId),
      ),
    );
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}
