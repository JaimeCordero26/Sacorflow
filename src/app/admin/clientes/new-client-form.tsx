"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "../actions";

export function NewClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nuevo cliente
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await crearCliente(fd);
        setOpen(false);
        router.refresh();
      }}
      className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2"
    >
      <input
        name="nombre"
        placeholder="Nombre de la empresa"
        required
        className="input"
      />
      <input
        name="contacto"
        placeholder="Contacto (email / teléfono)"
        className="input"
      />
      <textarea
        name="notas"
        placeholder="Notas"
        rows={2}
        className="input sm:col-span-2"
      />
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primary">Guardar</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
