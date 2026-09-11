"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { deleteProjectAction, moveProjectCardAction } from "@/app/admin/actions/proyectos";
import { ProjectCardFace } from "@/entities/project/ui/ProjectCardFace";
import { ProjectCardModal } from "@/features/manage-project-card/ui/ProjectCardModal";
import { KANBAN_COLUMNS } from "@/entities/project/model/types";
import { KanbanColumn } from "./KanbanColumn";
import type { KanbanColumn as KanbanColumnKey, ProjectCard } from "@/entities/project/model/types";

export function KanbanBoard({ cards: initial }: { cards: ProjectCard[] }) {
  const [cards, setCards] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openCard, setOpenCard] = useState<ProjectCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const cardId = String(e.active.id);
    const overColumn = e.over?.id as KanbanColumnKey | undefined;
    if (!overColumn) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.kanbanColumn === overColumn) return;

    const order = cards.filter((c) => c.kanbanColumn === overColumn).length;
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, kanbanColumn: overColumn, order } : c)),
    );
    await moveProjectCardAction(cardId, overColumn, order);
  }

  async function handleDelete(cardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setOpenCard(null);
    await deleteProjectAction(cardId);
  }

  const active = cards.find((c) => c.id === activeId) ?? null;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.key}
              column={column}
              cards={cards.filter((c) => c.kanbanColumn === column.key)}
              onOpen={setOpenCard}
            />
          ))}
        </div>
        <DragOverlay>
          {active ? <ProjectCardFace card={active} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {openCard && (
        <ProjectCardModal
          card={cards.find((c) => c.id === openCard.id) ?? openCard}
          onClose={() => setOpenCard(null)}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
