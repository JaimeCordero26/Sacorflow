"use client";

import { useDraggable } from "@dnd-kit/core";
import { ProjectCardFace } from "@/entities/project/ui/ProjectCardFace";
import type { ProjectCard } from "@/entities/project/model/types";

export function DraggableProjectCard({
  card,
  onOpen,
}: {
  card: ProjectCard;
  onOpen: (c: ProjectCard) => void;
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
      <ProjectCardFace card={card} />
    </div>
  );
}
