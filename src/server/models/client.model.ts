import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { clientes, proyectoClientes, proyectos } from "@/db/schema";
import type { Client, ClientListItem, ClientProjectSummary } from "@/entities/client/model/types";

export async function listClientsWithProjectCount(
  db: ReturnType<typeof getDb>,
): Promise<ClientListItem[]> {
  const rows = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      contacto: clientes.contacto,
      nProyectos: sql<number>`count(${proyectoClientes.proyectoId})`,
    })
    .from(clientes)
    .leftJoin(proyectoClientes, sql`${proyectoClientes.clienteId} = ${clientes.id}`)
    .groupBy(clientes.id)
    .orderBy(asc(clientes.nombre))
    .all();

  return rows.map((r) => ({
    id: r.id,
    name: r.nombre,
    contact: r.contacto,
    projectCount: r.nProyectos,
  }));
}

export async function listClientOptions(
  db: ReturnType<typeof getDb>,
): Promise<{ id: string; name: string }[]> {
  const rows = await db
    .select({ id: clientes.id, nombre: clientes.nombre })
    .from(clientes)
    .orderBy(asc(clientes.nombre))
    .all();
  return rows.map((r) => ({ id: r.id, name: r.nombre }));
}

export async function listClientsLinkedToProject(
  db: ReturnType<typeof getDb>,
  projectId: string,
): Promise<{ id: string; name: string }[]> {
  const rows = await db
    .select({ id: clientes.id, nombre: clientes.nombre })
    .from(proyectoClientes)
    .innerJoin(clientes, eq(clientes.id, proyectoClientes.clienteId))
    .where(eq(proyectoClientes.proyectoId, projectId))
    .all();
  return rows.map((r) => ({ id: r.id, name: r.nombre }));
}

export async function getClientById(
  db: ReturnType<typeof getDb>,
  id: string,
): Promise<Client | null> {
  const row = await db.select().from(clientes).where(eq(clientes.id, id)).get();
  if (!row) return null;
  return { id: row.id, name: row.nombre, contact: row.contacto, notes: row.notas };
}

export async function listClientProjects(
  db: ReturnType<typeof getDb>,
  clientId: string,
): Promise<ClientProjectSummary[]> {
  const rows = await db
    .select({
      id: proyectos.id,
      nombre: proyectos.nombre,
      columna: proyectos.columnaKanban,
      etapa: proyectos.etapaActual,
      progreso: proyectos.progresoPct,
      activo: proyectos.activo,
      creadoEn: proyectos.creadoEn,
    })
    .from(proyectoClientes)
    .innerJoin(proyectos, eq(proyectos.id, proyectoClientes.proyectoId))
    .where(eq(proyectoClientes.clienteId, clientId))
    .orderBy(desc(proyectos.creadoEn))
    .all();

  return rows.map((r) => ({
    id: r.id,
    name: r.nombre,
    kanbanColumn: r.columna,
    stage: r.etapa,
    progressPct: r.progreso,
    active: r.activo,
    createdAt: r.creadoEn,
  }));
}

export async function insertClient(
  db: ReturnType<typeof getDb>,
  data: { id: string; name: string; contact: string | null; notes: string | null },
): Promise<void> {
  await db.insert(clientes).values({
    id: data.id,
    nombre: data.name,
    contacto: data.contact,
    notas: data.notes,
  });
}

export async function updateClientFields(
  db: ReturnType<typeof getDb>,
  id: string,
  data: { name: string; contact: string | null; notes: string | null },
): Promise<void> {
  await db
    .update(clientes)
    .set({ nombre: data.name, contacto: data.contact, notas: data.notes })
    .where(eq(clientes.id, id));
}

export async function linkClientProject(
  db: ReturnType<typeof getDb>,
  clientId: string,
  projectId: string,
): Promise<void> {
  await db
    .insert(proyectoClientes)
    .values({ clienteId: clientId, proyectoId: projectId })
    .onConflictDoNothing();
}

export async function unlinkClientProject(
  db: ReturnType<typeof getDb>,
  clientId: string,
  projectId: string,
): Promise<void> {
  await db
    .delete(proyectoClientes)
    .where(
      and(
        eq(proyectoClientes.clienteId, clientId),
        eq(proyectoClientes.proyectoId, projectId),
      ),
    );
}
