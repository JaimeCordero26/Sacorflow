"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { IssueDetailModal } from "./IssueDetailModal";
import { GH_DRAG_PREFIX } from "@/entities/task/model/types";
import type { GithubIssueLite } from "@/lib/github-oauth";

function DraggableIssue({
  issue,
  onViewDetail,
}: {
  issue: GithubIssueLite;
  onViewDetail: (n: number) => void;
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
            onViewDetail(issue.number);
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
  projectId,
  issues,
  loading,
  error,
  onReload,
}: {
  projectId: string;
  issues: GithubIssueLite[] | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
}) {
  const [detailNumber, setDetailNumber] = useState<number | null>(null);
  const issueDetail = issues?.find((i) => i.number === detailNumber) ?? null;

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
          <DraggableIssue key={i.number} issue={i} onViewDetail={setDetailNumber} />
        ))}
      </div>

      {issueDetail && (
        <IssueDetailModal
          projectId={projectId}
          issueNumber={issueDetail.number}
          title={issueDetail.title}
          fallbackUrl={issueDetail.html_url}
          onClose={() => setDetailNumber(null)}
        />
      )}
    </div>
  );
}
