"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { formatDate } from "@/shared/lib/date";
import { addIdeaCommentAction } from "@/app/admin/actions/proyectos";
import { AuthorChip } from "@/entities/project/ui/AuthorChip";
import type { ProjectCard } from "@/entities/project/model/types";

export function ProjectCardModal({
  card,
  onClose,
  onDelete,
}: {
  card: ProjectCard;
  onClose: () => void;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    await addIdeaCommentAction(card.id, text);
    setText("");
    setSending(false);
    router.refresh();
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-bold text-white">{card.name}</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          ✕
        </button>
      </div>
      {card.description && (
        <p className="mt-2 text-sm text-slate-300">{card.description}</p>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <span>Creada por</span>
        <AuthorChip author={card.author} />
        <span>· {formatDate(card.createdAt)}</span>
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
          {card.comments.length === 0 && (
            <p className="text-sm text-slate-500">Sin aportes todavía.</p>
          )}
          {card.comments.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-white/5 bg-white/5 p-2.5 text-sm"
              style={{ borderLeft: `2px solid ${c.author.color}` }}
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <AuthorChip author={c.author} />
                <span className="text-slate-600">
                  {new Date(c.createdAt).toLocaleString("es-MX")}
                </span>
              </div>
              <p className="text-slate-200">{c.text}</p>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe un aporte…"
            className="input flex-1"
          />
          <button disabled={sending} className="btn-primary">
            Enviar
          </button>
        </form>
      </div>

      <div className="mt-6 border-t border-white/5 pt-4">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-medium text-pink-500/80 hover:text-pink-400"
          >
            Eliminar idea
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              ¿Eliminar «{card.name}» y todo su historial?
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
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
