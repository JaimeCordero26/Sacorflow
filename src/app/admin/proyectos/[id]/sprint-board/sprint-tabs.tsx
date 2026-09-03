"use client";

import { useState } from "react";
import { crearSprint } from "../sprint-actions";
import type { SprintInfo } from "./types";

const DOT_ESTADO: Record<SprintInfo["estado"], string> = {
  planificado: "bg-slate-500",
  activo: "bg-green-500",
  cerrado: "bg-slate-700",
};

export function SprintTabs({
  proyectoId,
  sprints,
  seleccionado,
  onSelect,
}: {
  proyectoId: string;
  sprints: SprintInfo[];
  seleccionado: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [nuevo, setNuevo] = useState(false);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/5 pb-3">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          seleccionado === null
            ? "bg-brand-500/15 text-brand-300"
            : "text-slate-400 hover:text-white"
        }`}
      >
        Backlog
      </button>
      {sprints.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            seleccionado === s.id
              ? "bg-brand-500/15 text-brand-300"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${DOT_ESTADO[s.estado]}`} />
          {s.nombre}
        </button>
      ))}

      {!nuevo ? (
        <button
          onClick={() => setNuevo(true)}
          className="ml-auto text-xs font-medium text-brand-400 hover:underline"
        >
          + Nuevo sprint
        </button>
      ) : (
        <form
          action={async (fd) => {
            const nombre = String(fd.get("nombre") ?? "");
            await crearSprint(proyectoId, nombre);
            setNuevo(false);
          }}
          className="ml-auto flex items-center gap-2"
        >
          <input
            name="nombre"
            placeholder="Nombre del sprint"
            required
            autoFocus
            className="input py-1 text-sm"
          />
          <button className="btn-primary px-3 py-1 text-xs">Crear</button>
          <button type="button" onClick={() => setNuevo(false)} className="btn-ghost px-3 py-1 text-xs">
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
