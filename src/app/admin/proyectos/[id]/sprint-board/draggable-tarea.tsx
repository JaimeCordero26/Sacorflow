"use client";

import { useDraggable } from "@dnd-kit/core";
import { TareaCardFace } from "./tarea-card";
import type { TareaCard } from "./types";

export function DraggableTarea({
  tarea,
  onOpen,
}: {
  tarea: TareaCard;
  onOpen: (t: TareaCard) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tarea.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(tarea)}
      className={`cursor-grab ${isDragging ? "opacity-40" : ""}`}
    >
      <TareaCardFace tarea={tarea} />
    </div>
  );
}
