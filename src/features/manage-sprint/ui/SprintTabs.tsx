"use client";

import { useState } from "react";
import { createSprintAction } from "@/app/admin/proyectos/[id]/sprint-actions";
import type { Sprint } from "@/entities/sprint/model/types";

const STATUS_DOT: Record<Sprint["status"], string> = {
  planificado: "bg-slate-500",
  activo: "bg-green-500",
  cerrado: "bg-slate-700",
};

export function SprintTabs({
  projectId,
  sprints,
  selected,
  onSelect,
}: {
  projectId: string;
  sprints: Sprint[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/5 pb-3">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          selected === null
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
            selected === s.id
              ? "bg-brand-500/15 text-brand-300"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s.status]}`} />
          {s.name}
        </button>
      ))}

      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="ml-auto text-xs font-medium text-brand-400 hover:underline"
        >
          + Nuevo sprint
        </button>
      ) : (
        <form
          action={async (fd) => {
            const name = String(fd.get("name") ?? "");
            await createSprintAction(projectId, name);
            setCreating(false);
          }}
          className="ml-auto flex items-center gap-2"
        >
          <input
            name="name"
            placeholder="Nombre del sprint"
            required
            autoFocus
            className="input py-1 text-sm"
          />
          <button className="btn-primary px-3 py-1 text-xs">Crear</button>
          <button type="button" onClick={() => setCreating(false)} className="btn-ghost px-3 py-1 text-xs">
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
