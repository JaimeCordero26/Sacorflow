import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { mensajesChat, proyectos } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const db = getDb();

  const [porColumna, inbox] = await Promise.all([
    db
      .select({
        columna: proyectos.columnaKanban,
        n: sql<number>`count(*)`,
      })
      .from(proyectos)
      .groupBy(proyectos.columnaKanban)
      .all(),
    db
      .select({
        id: proyectos.id,
        nombre: proyectos.nombre,
        activo: proyectos.activo,
        noLeidos: sql<number>`sum(case when ${mensajesChat.autorTipo} = 'cliente' and ${mensajesChat.leido} = 0 then 1 else 0 end)`,
        ultimaActividad: sql<string>`max(${mensajesChat.creadoEn})`,
        ultimoTexto: sql<string>`(select texto from mensajes_chat m2 where m2.proyecto_id = ${proyectos.id} order by m2.creado_en desc limit 1)`,
      })
      .from(proyectos)
      .innerJoin(mensajesChat, eq(mensajesChat.proyectoId, proyectos.id))
      .groupBy(proyectos.id)
      .orderBy(desc(sql`max(${mensajesChat.creadoEn})`))
      .all(),
  ]);

  const counts: Record<string, number> = {};
  for (const r of porColumna) counts[r.columna] = r.n;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading text-2xl">Resumen</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ideas" value={counts["idea"] ?? 0} accent="from-brand-500/20" />
          <Stat
            label="En progreso"
            value={counts["en_progreso"] ?? 0}
            accent="from-violet-600/20"
          />
          <Stat label="Listos" value={counts["listo"] ?? 0} accent="from-pink-500/20" />
          <Stat
            label="Pausados"
            value={counts["pausado"] ?? 0}
            accent="from-white/10"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="heading">Bandeja de mensajes</h2>
          <span className="text-sm text-slate-400">
            {inbox.reduce((a, r) => a + (r.noLeidos ?? 0), 0)} sin leer
          </span>
        </div>
        <div className="card mt-3 divide-y divide-white/5 overflow-hidden">
          {inbox.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500">
              Todavía no hay mensajes de clientes.
            </p>
          )}
          {inbox.map((row) => (
            <Link
              key={row.id}
              href={`/admin/proyectos/${row.id}`}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-white">
                    {row.nombre}
                  </span>
                  {(row.noLeidos ?? 0) > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gradient-2 px-1.5 text-xs font-bold text-ink-950">
                      {row.noLeidos}
                    </span>
                  )}
                  {!row.activo && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-slate-500">
                      inactivo
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-slate-500">
                  {row.ultimoTexto}
                </p>
              </div>
              <time className="shrink-0 text-xs text-slate-600">
                {row.ultimaActividad
                  ? new Date(row.ultimaActividad).toLocaleString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </time>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className={`card card-hover relative overflow-hidden p-4`}>
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} to-transparent`}
      />
      <div className="relative">
        <div className="text-3xl font-black text-white">{value}</div>
        <div className="mt-1 text-sm text-slate-400">{label}</div>
      </div>
    </div>
  );
}
