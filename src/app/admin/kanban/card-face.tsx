import { AutorChip } from "./avatar";
import type { KanbanCard } from "./types";

export function CardFace({ card, dragging }: { card: KanbanCard; dragging?: boolean }) {
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
