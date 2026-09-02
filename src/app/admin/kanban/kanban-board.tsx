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
import { moverTarjeta, eliminarProyecto } from "../actions";
import { CardFace } from "./card-face";
import { CardModal } from "./card-modal";
import { Column } from "./column";
import { COLUMNS } from "./types";
import type { Columna, KanbanCard } from "./types";

export type { Autor, KanbanCard } from "./types";

export function KanbanBoard({ cards: initial }: { cards: KanbanCard[] }) {
  const [cards, setCards] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openCard, setOpenCard] = useState<KanbanCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const cardId = String(e.active.id);
    const overCol = e.over?.id as Columna | undefined;
    if (!overCol) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.columna === overCol) return;

    const orden = cards.filter((c) => c.columna === overCol).length;
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, columna: overCol, orden } : c)),
    );
    await moverTarjeta(cardId, overCol, orden);
  }

  async function handleDelete(cardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setOpenCard(null);
    await eliminarProyecto(cardId);
  }

  const active = cards.find((c) => c.id === activeId) ?? null;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.key}
              col={col}
              cards={cards.filter((c) => c.columna === col.key)}
              onOpen={setOpenCard}
            />
          ))}
        </div>
        <DragOverlay>
          {active ? <CardFace card={active} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {openCard && (
        <CardModal
          card={cards.find((c) => c.id === openCard.id) ?? openCard}
          onClose={() => setOpenCard(null)}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
