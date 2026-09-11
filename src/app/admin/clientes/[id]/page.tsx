import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientDetail } from "@/server/services/client.service";
import { EditClientForm } from "@/features/edit-client/ui/EditClientForm";

export const dynamic = "force-dynamic";

const COLUMN_LABEL: Record<string, string> = {
  idea: "Idea",
  en_progreso: "En progreso",
  listo: "Listo",
  pausado: "Pausado",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();
  const { client, projects } = detail;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/clientes"
          className="text-sm text-slate-500 hover:text-brand-300 hover:underline"
        >
          ← Clientes
        </Link>
        <h1 className="mt-1 text-2xl font-black text-white">{client.name}</h1>
      </div>

      <EditClientForm client={client} />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          Proyectos históricos ({projects.length})
        </h2>
        <div className="card divide-y divide-white/5 overflow-hidden">
          {projects.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500">
              Este cliente no tiene proyectos vinculados.
            </p>
          )}
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/admin/proyectos/${p.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-white/5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{p.name}</p>
                <p className="text-xs text-slate-500">
                  {COLUMN_LABEL[p.kanbanColumn] ?? p.kanbanColumn}
                  {p.stage ? ` · ${p.stage}` : ""}
                  {!p.active ? " · inactivo" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/5 sm:block">
                  <div
                    className="h-full bg-brand-gradient-2"
                    style={{ width: `${p.progressPct}%` }}
                  />
                </div>
                <span className="w-9 text-right text-sm text-slate-500">
                  {p.progressPct}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
