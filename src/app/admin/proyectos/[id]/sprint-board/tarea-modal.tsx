"use client";

import { useState, useTransition } from "react";
import { eliminarTarea, moverTareaASprint } from "../sprint-actions";
import type { SprintInfo, TareaCard } from "./types";

export function TareaModal({
  tarea,
  proyectoId,
  sprints,
  onClose,
  onDeleted,
}: {
  tarea: TareaCard;
  proyectoId: string;
  sprints: SprintInfo[];
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [pending, start] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);

  function mover(sprintId: string | null) {
    start(async () => {
      await moverTareaASprint(tarea.id, proyectoId, sprintId);
      onClose();
    });
  }

  function eliminar() {
    start(async () => {
      await eliminarTarea(tarea.id, proyectoId);
      onDeleted(tarea.id);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-ink-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-white">{tarea.titulo}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            ✕
          </button>
        </div>
        {tarea.descripcion && (
          <p className="mt-2 text-sm text-slate-300">{tarea.descripcion}</p>
        )}
        {tarea.githubIssueNumber && (
          <a
            href={tarea.githubIssueUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-medium text-brand-400 hover:underline"
          >
            #{tarea.githubIssueNumber} en GitHub ↗
          </a>
        )}

        <div className="mt-5">
          <h4 className="mb-2 text-sm font-semibold text-white">Mover a</h4>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={pending || tarea.sprintId === null}
              onClick={() => mover(null)}
              className="badge border border-white/10 bg-white/5 text-slate-300 hover:text-white disabled:opacity-40"
            >
              Backlog
            </button>
            {sprints.map((s) => (
              <button
                key={s.id}
                disabled={pending || tarea.sprintId === s.id}
                onClick={() => mover(s.id)}
                className="badge border border-white/10 bg-white/5 text-slate-300 hover:text-white disabled:opacity-40"
              >
                {s.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-white/5 pt-4">
          {!confirmDel ? (
            <button
              onClick={() => setConfirmDel(true)}
              className="text-xs font-medium text-pink-500/80 hover:text-pink-400"
            >
              Eliminar tarea
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">¿Eliminar «{tarea.titulo}»?</span>
              <button
                disabled={pending}
                onClick={eliminar}
                className="rounded-lg bg-pink-500/90 px-2.5 py-1 text-xs font-semibold text-white hover:bg-pink-500 disabled:opacity-50"
              >
                {pending ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
