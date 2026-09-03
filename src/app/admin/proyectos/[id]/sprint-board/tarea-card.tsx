import type { TareaCard } from "./types";

export function TareaCardFace({ tarea, dragging }: { tarea: TareaCard; dragging?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-white/10 bg-ink-850 p-3 transition hover:border-brand-500/40 hover:shadow-neon ${
        dragging ? "rotate-2 shadow-neon" : ""
      }`}
    >
      <p className="text-sm font-semibold text-white">{tarea.titulo}</p>
      {tarea.descripcion && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-400">{tarea.descripcion}</p>
      )}
      {tarea.githubIssueNumber && (
        <a
          href={tarea.githubIssueUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-block text-xs font-medium text-brand-400 hover:underline"
        >
          #{tarea.githubIssueNumber} en GitHub ↗
        </a>
      )}
    </div>
  );
}
