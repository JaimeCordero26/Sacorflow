"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agregarComentario } from "../actions";
import { AutorChip } from "./avatar";
import type { KanbanCard } from "./types";

export function CardModal({
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
