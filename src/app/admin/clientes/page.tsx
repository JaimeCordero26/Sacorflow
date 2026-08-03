import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { clientes, proyectoClientes } from "@/db/schema";
import { NewClientForm } from "./new-client-form";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const db = getDb();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading text-2xl">Clientes</h1>
      </div>

      <NewClientForm />

      <div className="card divide-y divide-white/5 overflow-hidden">
        {rows.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500">
            Aún no hay clientes registrados.
          </p>
        )}
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/admin/clientes/${c.id}`}
            className="flex items-center justify-between px-4 py-3 transition hover:bg-white/5"
          >
            <div>
              <p className="font-medium text-white">{c.nombre}</p>
              {c.contacto && (
                <p className="text-sm text-slate-500">{c.contacto}</p>
              )}
            </div>
            <span className="text-sm text-slate-500">
              {c.nProyectos} proyecto{c.nProyectos === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
