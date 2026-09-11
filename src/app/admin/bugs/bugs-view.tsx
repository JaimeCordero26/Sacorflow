"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarBug, eliminarBug } from "../actions/bugs";
import { BugForm } from "./bug-form";
import { BugRow } from "./bug-row";
import { ESTADO_META, PRIO_META } from "./types";
import type { Bug, Estado, Prioridad } from "./types";

export function BugsView({
  bugs,
  proyectos,
}: {
  bugs: Bug[];
  proyectos: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [fEstado, setFEstado] = useState<"todos" | Estado>("todos");
  const [fPrio, setFPrio] = useState<"todas" | Prioridad>("todas");

  const abiertos = bugs.filter((b) => b.estado !== "resuelto").length;

  const visibles = useMemo(() => {
    return bugs
      .filter((b) => (fEstado === "todos" ? true : b.estado === fEstado))
      .filter((b) => (fPrio === "todas" ? true : b.prioridad === fPrio))
      .sort((a, b) => {
        // Resueltos al fondo; luego por prioridad; luego más recientes.
        const er = ESTADO_META[a.estado].rank - ESTADO_META[b.estado].rank;
        if (er !== 0) return er;
        const pr = PRIO_META[a.prioridad].rank - PRIO_META[b.prioridad].rank;
        if (pr !== 0) return pr;
        return b.creadoEn.localeCompare(a.creadoEn);
      });
  }, [bugs, fEstado, fPrio]);

  function update(id: string, data: { estado?: Estado; prioridad?: Prioridad }) {
    start(async () => {
      await actualizarBug(id, data);
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      await eliminarBug(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Errores</h1>
          <p className="mt-1 text-sm text-slate-400">
            {abiertos} sin resolver · prioriza y ataca por orden.
          </p>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="btn-primary">
          {open ? "Cerrar" : "+ Nuevo error"}
        </button>
      </div>

      {open && (
        <BugForm
          proyectos={proyectos}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Filter
          label="Estado"
          value={fEstado}
          onChange={(v) => setFEstado(v as typeof fEstado)}
          options={[
            ["todos", "Todos"],
            ["abierto", "Abierto"],
            ["en_progreso", "En progreso"],
            ["resuelto", "Resuelto"],
          ]}
        />
        <Filter
          label="Prioridad"
          value={fPrio}
          onChange={(v) => setFPrio(v as typeof fPrio)}
          options={[
            ["todas", "Todas"],
            ["alta", "Alta"],
            ["media", "Media"],
            ["baja", "Baja"],
          ]}
        />
      </div>

      <div className="space-y-2">
        {visibles.length === 0 && (
          <p className="card p-8 text-center text-sm text-slate-500">
            Sin errores. Registra el primero con “+ Nuevo error”.
          </p>
        )}
        {visibles.map((b) => (
          <BugRow key={b.id} bug={b} pending={pending} onUpdate={update} onRemove={remove} />
        ))}
      </div>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-slate-500">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input !w-auto !py-1 text-xs"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
