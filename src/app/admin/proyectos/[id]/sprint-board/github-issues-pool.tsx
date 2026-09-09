"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { IssueDetailModal } from "./issue-detail-modal";
import { GH_DRAG_PREFIX, type GithubIssueLite } from "./types";

function DraggableIssue({
  issue,
  onVerDetalle,
}: {
  issue: GithubIssueLite;
  onVerDetalle: (n: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${GH_DRAG_PREFIX}${issue.number}`,
    data: { issue },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`cursor-grab rounded-lg border border-white/10 bg-ink-850 p-2.5 transition hover:border-brand-500/40 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <p className="text-sm text-white">{issue.title}</p>
      <div className="mt-0.5 flex items-center justify-between">
        <p className="text-xs text-slate-500">#{issue.number}</p>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onVerDetalle(issue.number);
          }}
          className="text-xs font-medium text-brand-400 hover:underline"
        >
          Ver detalle
        </button>
      </div>
    </div>
  );
}

export function GithubIssuesPool({
  proyectoId,
  issues,
  loading,
  error,
  onReload,
}: {
  proyectoId: string;
  issues: GithubIssueLite[] | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
}) {
  const [detalleNumero, setDetalleNumero] = useState<number | null>(null);
  const issueDetalle = issues?.find((i) => i.number === detalleNumero) ?? null;

  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/40 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Issues de GitHub</h4>
        <button onClick={onReload} disabled={loading} className="btn-ghost text-xs">
          {loading ? "Cargando…" : issues ? "Actualizar" : "Cargar"}
        </button>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        Arrastra un issue al tablero para convertirlo en tarea.
      </p>
      {error && <p className="text-xs text-pink-400">{error}</p>}
      <div className="flex flex-col gap-2">
        {issues?.length === 0 && (
          <p className="text-xs text-slate-500">No hay issues abiertos disponibles.</p>
        )}
        {issues?.map((i) => (
          <DraggableIssue key={i.number} issue={i} onVerDetalle={setDetalleNumero} />
        ))}
      </div>

      {issueDetalle && (
        <IssueDetailModal
          proyectoId={proyectoId}
          issueNumber={issueDetalle.number}
          title={issueDetalle.title}
          fallbackUrl={issueDetalle.html_url}
          onClose={() => setDetalleNumero(null)}
        />
      )}
    </div>
  );
}
