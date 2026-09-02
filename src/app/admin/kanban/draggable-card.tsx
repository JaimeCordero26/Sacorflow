"use client";

import { useDraggable } from "@dnd-kit/core";
import { CardFace } from "./card-face";
import type { KanbanCard } from "./types";

export function DraggableCard({
  card,
  onOpen,
}: {
  card: KanbanCard;
  onOpen: (c: KanbanCard) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card)}
      className={`cursor-grab ${isDragging ? "opacity-40" : ""}`}
    >
      <CardFace card={card} />
    </div>
  );
}
