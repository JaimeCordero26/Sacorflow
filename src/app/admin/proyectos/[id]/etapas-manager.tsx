"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearEtapa, eliminarEtapa } from "../../actions";

export function EtapasManager({
  etapas,
}: {
  etapas: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");

  function add() {
    const n = nombre.trim();
    if (!n) return;
    start(async () => {
      await crearEtapa(n, etapas.length);
      setNombre("");
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      await eliminarEtapa(id);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-slate-500 hover:text-slate-300"
      >
        {open ? "Ocultar gestor de etapas" : "Gestionar etapas ›"}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-500">
            Las etapas son compartidas por todos los proyectos (p.ej. Diseño,
            Desarrollo, QA, Entregado, En garantía).
          </p>

          {etapas.length > 0 ? (
            <ul className="space-y-1">
              {etapas.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-850 px-3 py-1.5 text-sm text-slate-200"
                >
                  <span>{e.nombre}</span>
                  <button
                    onClick={() => remove(e.id)}
                    disabled={pending}
                    className="text-slate-600 hover:text-pink-400"
                    title="Eliminar etapa"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-600">Aún no hay etapas.</p>
          )}

          <div className="flex gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="Nueva etapa"
              className="input flex-1"
            />
            <button
              onClick={add}
              disabled={pending || !nombre.trim()}
              className="btn-primary"
            >
              Añadir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
