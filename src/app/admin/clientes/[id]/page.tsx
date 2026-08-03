import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clientes, proyectoClientes, proyectos } from "@/db/schema";
import { EditClientForm } from "./edit-client-form";

export const dynamic = "force-dynamic";

const COLUMN_LABEL: Record<string, string> = {
  idea: "Idea",
  en_progreso: "En progreso",
  listo: "Listo",
  pausado: "Pausado",
};

export default async function ClienteDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const cliente = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id))
    .get();
  if (!cliente) notFound();

  const proyectosCliente = await db
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
    .where(eq(proyectoClientes.clienteId, id))
    .orderBy(desc(proyectos.creadoEn))
    .all();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/clientes"
          className="text-sm text-slate-500 hover:text-brand-300 hover:underline"
        >
          ← Clientes
        </Link>
        <h1 className="mt-1 text-2xl font-black text-white">{cliente.nombre}</h1>
      </div>

      <EditClientForm
        id={cliente.id}
        nombre={cliente.nombre}
        contacto={cliente.contacto}
        notas={cliente.notas}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          Proyectos históricos ({proyectosCliente.length})
        </h2>
        <div className="card divide-y divide-white/5 overflow-hidden">
          {proyectosCliente.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500">
              Este cliente no tiene proyectos vinculados.
            </p>
          )}
          {proyectosCliente.map((p) => (
            <Link
              key={p.id}
              href={`/admin/proyectos/${p.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-white/5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{p.nombre}</p>
                <p className="text-xs text-slate-500">
                  {COLUMN_LABEL[p.columna] ?? p.columna}
                  {p.etapa ? ` · ${p.etapa}` : ""}
                  {!p.activo ? " · inactivo" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/5 sm:block">
                  <div
                    className="h-full bg-brand-gradient-2"
                    style={{ width: `${p.progreso}%` }}
                  />
                </div>
                <span className="w-9 text-right text-sm text-slate-500">
                  {p.progreso}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
