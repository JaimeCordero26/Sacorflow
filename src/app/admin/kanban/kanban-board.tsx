"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  crearProyecto,
  moverTarjeta,
  agregarComentario,
  eliminarProyecto,
} from "../actions";

type Columna = "idea" | "en_progreso" | "listo" | "pausado"| "cancelado" | "entregado" | "cerrado";

export interface Autor {
  nombre: string;
  color: string;
  avatar: string | null;
}

export interface KanbanCard {
  id: string;
  nombre: string;
  descripcion: string | null;
  columna: Columna;
  orden: number;
  autor: Autor;
  tieneRepo: boolean;
  creadoEn: string;
  comentarios: { id: string; texto: string; autor: Autor; creadoEn: string }[];
}

const COLUMNS: { key: Columna; label: string; dot: string }[] = [
  { key: "idea", label: "Ideas", dot: "bg-brand-500" },
  { key: "en_progreso", label: "En progreso", dot: "bg-violet-500" },
  { key: "listo", label: "Listos", dot: "bg-pink-500" },
  { key: "pausado", label: "Pausado", dot: "bg-slate-500" },
  { key: "cancelado", label: "Cancelado", dot: "bg-red-500" },
  { key: "entregado", label: "Entregado", dot: "bg-green-500" },
  { key: "cerrado", label: "Cerrado", dot: "bg-gray-500" },
];

function Avatar({ autor, size = 20 }: { autor: Autor; size?: number }) {
  const px = { width: size, height: size };
  if (autor.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={autor.avatar}
        alt={autor.nombre}
        style={px}
        className="rounded-full ring-1 ring-white/20"
      />
    );
  }
  return (
    <span
      style={{ ...px, backgroundColor: `${autor.color}22`, color: autor.color, borderColor: `${autor.color}55` }}
      className="inline-flex items-center justify-center rounded-full border text-[10px] font-bold"
    >
      {autor.nombre.charAt(0).toUpperCase()}
    </span>
  );
}

function AutorChip({ autor }: { autor: Autor }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar autor={autor} size={18} />
      <span style={{ color: autor.color }} className="text-xs font-medium">
        {autor.nombre}
      </span>
    </span>
  );
}

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

function Column({
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

function DraggableCard({
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

function CardFace({ card, dragging }: { card: KanbanCard; dragging?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-white/10 bg-ink-850 p-3 transition hover:border-brand-500/40 hover:shadow-neon ${
        dragging ? "rotate-2 shadow-neon" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white">{card.nombre}</p>
        {card.tieneRepo && (
          <span className="badge shrink-0 border border-brand-500/30 bg-brand-500/10 text-brand-300">
            repo
          </span>
        )}
      </div>
      {card.descripcion && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-400">
          {card.descripcion}
        </p>
      )}
      <div className="mt-2.5 flex items-center justify-between">
        <AutorChip autor={card.autor} />
        {card.comentarios.length > 0 && (
          <span className="text-xs text-slate-500">
            💬 {card.comentarios.length}
          </span>
        )}
      </div>
    </div>
  );
}

function NewIdeaForm() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-white/15 px-3 py-2 text-sm text-slate-400 transition hover:border-brand-500/50 hover:text-brand-300"
      >
        + Nueva idea
      </button>
    );
  }
  return (
    <form
      action={async (fd) => {
        await crearProyecto(fd);
        setOpen(false);
      }}
      className="rounded-lg border border-white/10 bg-ink-850 p-3"
    >
      <input name="nombre" placeholder="Título" required autoFocus className="input" />
      <textarea
        name="descripcion"
        placeholder="Descripción (opcional)"
        rows={2}
        className="input mt-2"
      />
      <div className="mt-2 flex gap-2">
        <button className="btn-primary flex-1">Crear</button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function CardModal({
  card,
  onClose,
  onDelete,
}: {
  card: KanbanCard;
  onClose: () => void;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setSending(true);
    await agregarComentario(card.id, texto);
    setTexto("");
    setSending(false);
    router.refresh();
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
          <h3 className="text-lg font-bold text-white">{card.nombre}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            ✕
          </button>
        </div>
        {card.descripcion && (
          <p className="mt-2 text-sm text-slate-300">{card.descripcion}</p>
        )}
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span>Creada por</span>
          <AutorChip autor={card.autor} />
          <span>· {new Date(card.creadoEn).toLocaleDateString("es-MX")}</span>
        </div>

        <Link
          href={`/admin/proyectos/${card.id}`}
          className="mt-3 inline-block text-sm font-medium text-brand-400 hover:underline"
        >
          Abrir vista completa del proyecto →
        </Link>

        <div className="mt-5">
          <h4 className="mb-2 text-sm font-semibold text-white">
            Aportes / comentarios
          </h4>
          <div className="space-y-2">
            {card.comentarios.length === 0 && (
              <p className="text-sm text-slate-500">Sin aportes todavía.</p>
            )}
            {card.comentarios.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-white/5 bg-white/5 p-2.5 text-sm"
                style={{ borderLeft: `2px solid ${c.autor.color}` }}
              >
                <div className="mb-1 flex items-center justify-between text-xs">
                  <AutorChip autor={c.autor} />
                  <span className="text-slate-600">
                    {new Date(c.creadoEn).toLocaleString("es-MX")}
                  </span>
                </div>
                <p className="text-slate-200">{c.texto}</p>
              </div>
            ))}
          </div>
          <form onSubmit={submit} className="mt-3 flex gap-2">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe un aporte…"
              className="input flex-1"
            />
            <button disabled={sending} className="btn-primary">
              Enviar
            </button>
          </form>
        </div>

        <div className="mt-6 border-t border-white/5 pt-4">
          {!confirmDel ? (
            <button
              onClick={() => setConfirmDel(true)}
              className="text-xs font-medium text-pink-500/80 hover:text-pink-400"
            >
              Eliminar idea
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                ¿Eliminar «{card.nombre}» y todo su historial?
              </span>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  await onDelete(card.id);
                }}
                className="rounded-lg bg-pink-500/90 px-2.5 py-1 text-xs font-semibold text-white hover:bg-pink-500 disabled:opacity-50"
              >
                {deleting ? "Eliminando…" : "Sí, eliminar"}
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
