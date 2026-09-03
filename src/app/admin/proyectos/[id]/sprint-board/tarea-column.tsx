"use client";

import { useDroppable } from "@dnd-kit/core";
import { DraggableTarea } from "./draggable-tarea";
import { NewTareaForm } from "./new-tarea-form";
import type { ColumnaTarea, TareaCard } from "./types";

export function TareaColumn({
  col,
  tareas,
  proyectoId,
  sprintId,
  onOpen,
}: {
  col: { key: ColumnaTarea; label: string; dot: string };
  tareas: TareaCard[];
  proyectoId: string;
  sprintId: string | null;
  onOpen: (t: TareaCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border p-3 transition ${
        isOver ? "border-brand-500/50 bg-brand-500/5" : "border-white/10 bg-ink-900/40"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className={`h-2 w-2 rounded-full ${col.dot}`} />
          {col.label}
        </h4>
        <span className="rounded-full bg-white/5 px-2 text-xs text-slate-400">
          {tareas.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {col.key === "por_hacer" && (
          <NewTareaForm proyectoId={proyectoId} sprintId={sprintId} />
        )}
        {tareas.map((t) => (
          <DraggableTarea key={t.id} tarea={t} onOpen={onOpen} />
        ))}
        {tareas.length === 0 && col.key !== "por_hacer" && (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-600">
            Vacío
          </p>
        )}
      </div>
    </div>
  );
}
