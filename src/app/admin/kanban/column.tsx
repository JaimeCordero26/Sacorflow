"use client";

import { useDroppable } from "@dnd-kit/core";
import { DraggableCard } from "./draggable-card";
import { NewIdeaForm } from "./new-idea-form";
import type { Columna, KanbanCard } from "./types";

export function Column({
  col,
  cards,
  onOpen,
}: {
  col: { key: Columna; label: string; dot: string };
  cards: KanbanCard[];
  onOpen: (c: KanbanCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border p-3 transition ${
        isOver
          ? "border-brand-500/50 bg-brand-500/5"
          : "border-white/10 bg-ink-900/40"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className={`h-2 w-2 rounded-full ${col.dot}`} />
          {col.label}
        </h3>
        <span className="rounded-full bg-white/5 px-2 text-xs text-slate-400">
          {cards.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {col.key === "idea" && <NewIdeaForm />}
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} onOpen={onOpen} />
        ))}
        {cards.length === 0 && col.key !== "idea" && (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-600">
            Vacío
          </p>
        )}
      </div>
    </div>
  );
}
