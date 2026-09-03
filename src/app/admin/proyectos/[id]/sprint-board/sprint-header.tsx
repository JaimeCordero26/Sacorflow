"use client";

import { useState, useTransition } from "react";
import { cerrarSprint, eliminarSprint, iniciarSprint } from "../sprint-actions";
import type { SprintInfo } from "./types";

const ESTADO_BADGE: Record<SprintInfo["estado"], string> = {
  planificado: "border-white/10 bg-white/5 text-slate-400",
  activo: "border-green-500/40 bg-green-500/10 text-green-300",
  cerrado: "border-white/10 bg-white/5 text-slate-500",
};

export function SprintHeader({
  sprint,
  proyectoId,
  onDeleted,
}: {
  sprint: SprintInfo;
  proyectoId: string;
  onDeleted: () => void;
}) {
  const [pending, start] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white">{sprint.nombre}</h3>
        <span className={`badge border ${ESTADO_BADGE[sprint.estado]}`}>{sprint.estado}</span>
      </div>
      <div className="flex items-center gap-2">
        {sprint.estado === "planificado" && (
          <button
            disabled={pending}
            onClick={() => start(() => iniciarSprint(sprint.id, proyectoId))}
            className="btn-ghost"
          >
            Iniciar sprint
          </button>
        )}
        {sprint.estado === "activo" && (
          <button
            disabled={pending}
            onClick={() => start(() => cerrarSprint(sprint.id, proyectoId))}
            className="btn-ghost"
          >
            Cerrar sprint
          </button>
        )}
        {!confirmDel ? (
          <button
            onClick={() => setConfirmDel(true)}
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
                  await eliminarSprint(sprint.id, proyectoId);
                  onDeleted();
                })
              }
              className="font-semibold text-pink-400 hover:text-pink-300"
            >
              Sí
            </button>
            <button
              onClick={() => setConfirmDel(false)}
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
