"use client";

import { useState, useTransition } from "react";
import { closeSprintAction, deleteSprintAction, startSprintAction } from "@/app/admin/proyectos/[id]/sprint-actions";
import type { Sprint } from "@/entities/sprint/model/types";

const STATUS_BADGE: Record<Sprint["status"], string> = {
  planificado: "border-white/10 bg-white/5 text-slate-400",
  activo: "border-green-500/40 bg-green-500/10 text-green-300",
  cerrado: "border-white/10 bg-white/5 text-slate-500",
};

export function SprintHeader({
  sprint,
  projectId,
  onDeleted,
}: {
  sprint: Sprint;
  projectId: string;
  onDeleted: () => void;
}) {
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white">{sprint.name}</h3>
        <span className={`badge border ${STATUS_BADGE[sprint.status]}`}>{sprint.status}</span>
      </div>
      <div className="flex items-center gap-2">
        {sprint.status === "planificado" && (
          <button
            disabled={pending}
            onClick={() => start(() => startSprintAction(sprint.id, projectId))}
            className="btn-ghost"
          >
            Iniciar sprint
          </button>
        )}
        {sprint.status === "activo" && (
          <button
            disabled={pending}
            onClick={() => start(() => closeSprintAction(sprint.id, projectId))}
            className="btn-ghost"
          >
            Cerrar sprint
          </button>
        )}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-pink-500/80 hover:text-pink-400"
          >
            Eliminar
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">¿Seguro?</span>
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteSprintAction(sprint.id, projectId);
                  onDeleted();
                })
              }
              className="font-semibold text-pink-400 hover:text-pink-300"
            >
              Sí
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              No
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
