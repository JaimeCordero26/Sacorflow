import type { TareaCard } from "./types";

export function TareaCardFace({
  tarea,
  dragging,
  onVerIssue,
}: {
  tarea: TareaCard;
  dragging?: boolean;
  onVerIssue?: (tarea: TareaCard) => void;
}) {
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
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVerIssue?.(tarea);
            }}
            className="text-xs font-medium text-brand-400 hover:underline"
          >
            Ver detalle · #{tarea.githubIssueNumber}
          </button>
          <a
            href={tarea.githubIssueUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Abrir en GitHub"
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            ↗
          </a>
        </div>
      )}
    </div>
  );
}
