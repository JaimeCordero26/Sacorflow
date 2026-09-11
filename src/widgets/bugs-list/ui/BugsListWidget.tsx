"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBugAction, updateBugAction } from "@/app/admin/actions/bugs";
import { CreateBugForm } from "@/features/create-bug/ui/CreateBugForm";
import { BugRow } from "@/features/manage-bug/ui/BugRow";
import { STATUS_META, PRIORITY_META } from "@/entities/bug/model/types";
import type { Bug, Status, Priority } from "@/entities/bug/model/types";
import type { ProjectOption } from "@/server/models/bug.model";

export function BugsListWidget({
  bugs,
  projects,
}: {
  bugs: Bug[];
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"todos" | Status>("todos");
  const [priorityFilter, setPriorityFilter] = useState<"todas" | Priority>("todas");

  const openCount = bugs.filter((b) => b.status !== "resuelto").length;

  const visible = useMemo(() => {
    return bugs
      .filter((b) => (statusFilter === "todos" ? true : b.status === statusFilter))
      .filter((b) => (priorityFilter === "todas" ? true : b.priority === priorityFilter))
      .sort((a, b) => {
        // Resueltos al fondo; luego por prioridad; luego más recientes.
        const statusRank = STATUS_META[a.status].rank - STATUS_META[b.status].rank;
        if (statusRank !== 0) return statusRank;
        const priorityRank = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
        if (priorityRank !== 0) return priorityRank;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [bugs, statusFilter, priorityFilter]);

  function update(id: string, data: { status?: Status; priority?: Priority }) {
    start(async () => {
      await updateBugAction(id, data);
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      await deleteBugAction(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Errores</h1>
          <p className="mt-1 text-sm text-slate-400">
            {openCount} sin resolver · prioriza y ataca por orden.
          </p>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="btn-primary">
          {open ? "Cerrar" : "+ Nuevo error"}
        </button>
      </div>

      {open && (
        <CreateBugForm
          projects={projects}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Filter
          label="Estado"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as typeof statusFilter)}
          options={[
            ["todos", "Todos"],
            ["abierto", "Abierto"],
            ["en_progreso", "En progreso"],
            ["resuelto", "Resuelto"],
          ]}
        />
        <Filter
          label="Prioridad"
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as typeof priorityFilter)}
          options={[
            ["todas", "Todas"],
            ["alta", "Alta"],
            ["media", "Media"],
            ["baja", "Baja"],
          ]}
        />
      </div>

      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="card p-8 text-center text-sm text-slate-500">
            Sin errores. Registra el primero con “+ Nuevo error”.
          </p>
        )}
        {visible.map((b) => (
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
