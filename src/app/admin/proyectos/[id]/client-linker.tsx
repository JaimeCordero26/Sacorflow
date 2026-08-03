"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  vincularClienteProyecto,
  desvincularClienteProyecto,
} from "../../actions";

export function ClientLinker({
  proyectoId,
  todos,
  vinculados,
}: {
  proyectoId: string;
  todos: { id: string; nombre: string }[];
  vinculados: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState("");

  const disponibles = todos.filter(
    (c) => !vinculados.some((v) => v.id === c.id),
  );

  function link() {
    if (!sel) return;
    start(async () => {
      await vincularClienteProyecto(sel, proyectoId);
      setSel("");
      router.refresh();
    });
  }

  function unlink(clienteId: string) {
    start(async () => {
      await desvincularClienteProyecto(clienteId, proyectoId);
      router.refresh();
    });
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-slate-300">Clientes</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {vinculados.length === 0 && (
          <span className="text-sm text-slate-500">Sin clientes vinculados.</span>
        )}
        {vinculados.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1 text-sm text-slate-200"
          >
            <Link href={`/admin/clientes/${c.id}`} className="hover:underline">
              {c.nombre}
            </Link>
            <button
              onClick={() => unlink(c.id)}
              disabled={pending}
              className="flex h-5 w-5 items-center justify-center rounded-full text-slate-500 hover:bg-white/10 hover:text-pink-400"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      {disponibles.length > 0 && (
        <div className="mt-3 flex gap-2">
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="input flex-1"
          >
            <option value="">Vincular cliente…</option>
            {disponibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <button onClick={link} disabled={pending || !sel} className="btn-ghost">
            Vincular
          </button>
        </div>
      )}
    </section>
  );
}
