"use client";

import { useRouter } from "next/navigation";
import { updateClientAction } from "@/app/admin/actions/clientes";
import type { Client } from "@/entities/client/model/types";

export function EditClientForm({ client }: { client: Client }) {
  const router = useRouter();
  return (
    <form
      action={async (fd) => {
        await updateClientAction(client.id, fd);
        router.refresh();
      }}
      className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2"
    >
      <label className="block sm:col-span-1">
        <span className="label">Nombre</span>
        <input name="name" defaultValue={client.name} required className="input" />
      </label>
      <label className="block sm:col-span-1">
        <span className="label">Contacto</span>
        <input name="contact" defaultValue={client.contact ?? ""} className="input" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Notas</span>
        <textarea
          name="notes"
          defaultValue={client.notes ?? ""}
          rows={3}
          className="input"
        />
      </label>
      <div className="sm:col-span-2">
        <button className="btn-primary">Guardar cambios</button>
      </div>
    </form>
  );
}
