import { getDb } from "@/db";
import { newId } from "@/lib/ids";
import {
  getClientById,
  insertClient,
  linkClientProject,
  listClientProjects,
  listClientsWithProjectCount,
  unlinkClientProject,
  updateClientFields,
} from "@/server/models/client.model";
import type { Client, ClientListItem, ClientProjectSummary } from "@/entities/client/model/types";

export async function getClientsPageData(): Promise<ClientListItem[]> {
  return listClientsWithProjectCount(getDb());
}

export interface ClientDetail {
  client: Client;
  projects: ClientProjectSummary[];
}

export async function getClientDetail(id: string): Promise<ClientDetail | null> {
  const db = getDb();
  const client = await getClientById(db, id);
  if (!client) return null;
  const projects = await listClientProjects(db, id);
  return { client, projects };
}

export async function createClient(data: {
  name: string;
  contact: string | null;
  notes: string | null;
}): Promise<void> {
  if (!data.name.trim()) return;
  await insertClient(getDb(), {
    id: newId(),
    name: data.name.trim(),
    contact: data.contact?.trim() || null,
    notes: data.notes?.trim() || null,
  });
}

export async function updateClient(
  id: string,
  data: { name: string; contact: string | null; notes: string | null },
): Promise<void> {
  await updateClientFields(getDb(), id, {
    name: data.name.trim(),
    contact: data.contact?.trim() || null,
    notes: data.notes?.trim() || null,
  });
}

export async function linkClientToProject(clientId: string, projectId: string): Promise<void> {
  await linkClientProject(getDb(), clientId, projectId);
}

export async function unlinkClientFromProject(clientId: string, projectId: string): Promise<void> {
  await unlinkClientProject(getDb(), clientId, projectId);
}
