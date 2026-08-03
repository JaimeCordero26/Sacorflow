"use client";

import { useRouter } from "next/navigation";
import { actualizarCliente } from "../../actions";

export function EditClientForm({
  id,
  nombre,
  contacto,
  notas,
}: {
  id: string;
  nombre: string;
  contacto: string | null;
  notas: string | null;
}) {
  const router = useRouter();
  return (
    <form
      action={async (fd) => {
        await actualizarCliente(id, fd);
        router.refresh();
      }}
      className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2"
    >
      <label className="block sm:col-span-1">
        <span className="label">Nombre</span>
        <input name="nombre" defaultValue={nombre} required className="input" />
      </label>
      <label className="block sm:col-span-1">
        <span className="label">Contacto</span>
        <input name="contacto" defaultValue={contacto ?? ""} className="input" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Notas</span>
        <textarea
          name="notas"
          defaultValue={notas ?? ""}
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
