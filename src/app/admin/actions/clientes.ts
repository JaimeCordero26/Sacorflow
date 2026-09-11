"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import * as clientService from "@/server/services/client.service";

export async function createClientAction(formData: FormData) {
  await requireSession();
  await clientService.createClient({
    name: String(formData.get("name") ?? "").trim(),
    contact: String(formData.get("contact") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/admin/clientes");
}

export async function updateClientAction(id: string, formData: FormData) {
  await requireSession();
  await clientService.updateClient(id, {
    name: String(formData.get("name") ?? "").trim(),
    contact: String(formData.get("contact") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
}

export async function linkClientToProjectAction(clientId: string, projectId: string) {
  await requireSession();
  await clientService.linkClientToProject(clientId, projectId);
  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath(`/admin/proyectos/${projectId}`);
}

export async function unlinkClientFromProjectAction(clientId: string, projectId: string) {
  await requireSession();
  await clientService.unlinkClientFromProject(clientId, projectId);
  revalidatePath(`/admin/clientes/${clientId}`);
  revalidatePath(`/admin/proyectos/${projectId}`);
}
