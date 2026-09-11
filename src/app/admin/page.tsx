import Link from "next/link";
import { getDashboardData } from "@/server/services/project.service";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { columnCounts, inbox } = await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading text-2xl">Resumen</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ideas" value={columnCounts["idea"] ?? 0} accent="from-brand-500/20" />
          <Stat
            label="En progreso"
            value={columnCounts["en_progreso"] ?? 0}
            accent="from-violet-600/20"
          />
          <Stat label="Listos" value={columnCounts["listo"] ?? 0} accent="from-pink-500/20" />
          <Stat
            label="Pausados"
            value={columnCounts["pausado"] ?? 0}
            accent="from-white/10"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="heading">Bandeja de mensajes</h2>
          <span className="text-sm text-slate-400">
            {inbox.reduce((a, r) => a + r.unreadCount, 0)} sin leer
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
                    {row.name}
                  </span>
                  {row.unreadCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gradient-2 px-1.5 text-xs font-bold text-ink-950">
                      {row.unreadCount}
                    </span>
                  )}
                  {!row.active && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-slate-500">
                      inactivo
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-slate-500">
                  {row.lastMessageText}
                </p>
              </div>
              <time className="shrink-0 text-xs text-slate-600">
                {row.lastActivityAt
                  ? new Date(row.lastActivityAt).toLocaleString("es-MX", {
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
