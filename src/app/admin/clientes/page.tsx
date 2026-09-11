import Link from "next/link";
import { getClientsPageData } from "@/server/services/client.service";
import { CreateClientForm } from "@/features/create-client/ui/CreateClientForm";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await getClientsPageData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="heading text-2xl">Clientes</h1>
      </div>

      <CreateClientForm />

      <div className="card divide-y divide-white/5 overflow-hidden">
        {clients.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500">
            Aún no hay clientes registrados.
          </p>
        )}
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/admin/clientes/${c.id}`}
            className="flex items-center justify-between px-4 py-3 transition hover:bg-white/5"
          >
            <div>
              <p className="font-medium text-white">{c.name}</p>
              {c.contact && <p className="text-sm text-slate-500">{c.contact}</p>}
            </div>
            <span className="text-sm text-slate-500">
              {c.projectCount} proyecto{c.projectCount === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
