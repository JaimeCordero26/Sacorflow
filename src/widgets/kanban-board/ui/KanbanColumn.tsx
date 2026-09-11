"use client";

import { useDroppable } from "@dnd-kit/core";
import { CreateIdeaForm } from "@/features/create-project-idea/ui/CreateIdeaForm";
import { DraggableProjectCard } from "./DraggableProjectCard";
import type { KanbanColumn as KanbanColumnKey, ProjectCard } from "@/entities/project/model/types";

export function KanbanColumn({
  column,
  cards,
  onOpen,
}: {
  column: { key: KanbanColumnKey; label: string; dot: string };
  cards: ProjectCard[];
  onOpen: (c: ProjectCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
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
          <span className={`h-2 w-2 rounded-full ${column.dot}`} />
          {column.label}
        </h3>
        <span className="rounded-full bg-white/5 px-2 text-xs text-slate-400">
          {cards.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {column.key === "idea" && <CreateIdeaForm />}
        {cards.map((c) => (
          <DraggableProjectCard key={c.id} card={c} onOpen={onOpen} />
        ))}
        {cards.length === 0 && column.key !== "idea" && (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-600">
            Vacío
          </p>
        )}
      </div>
    </div>
  );
}
