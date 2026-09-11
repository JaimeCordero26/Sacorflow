"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { formatFechaHora } from "@/lib/format";
import { cargarDetalleIssue } from "../sprint-actions";
import type { GithubIssueComment, GithubIssueDetail } from "@/lib/github-oauth";

function Avatar({ actor }: { actor: { login: string; avatar_url: string } }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={actor.avatar_url}
      alt={actor.login}
      className="h-5 w-5 rounded-full border border-white/10"
    />
  );
}

// Fetch + render del cuerpo del issue (estado, labels, asignados, descripción,
// comentarios). Sin título ni chrome de modal, para poder incrustarse directo
// dentro de otro modal (ej. TareaModal) o envolverse en un popup propio
// (IssueDetailModal, para issues del pool que aún no son tarea).
export function IssueDetailContent({
  proyectoId,
  issueNumber,
  fallbackUrl,
}: {
  proyectoId: string;
  issueNumber: number;
  fallbackUrl: string | null;
}) {
  const [pending, start] = useTransition();
  const [detalle, setDetalle] = useState<GithubIssueDetail | null>(null);
  const [comentarios, setComentarios] = useState<GithubIssueComment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    start(async () => {
      const res = await cargarDetalleIssue(proyectoId, issueNumber);
      if (res.ok) {
        setDetalle(res.detalle ?? null);
        setComentarios(res.comentarios ?? []);
      } else {
        setError(res.error ?? "No se pudo cargar el issue.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId, issueNumber]);

  return (
    <div>
      {pending && <p className="text-sm text-slate-400">Cargando issue…</p>}
      {error && <p className="text-sm text-pink-400">{error}</p>}

      {detalle && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span
              className={`badge ${
                detalle.state === "open"
                  ? "border border-green-500/30 bg-green-500/10 text-green-400"
                  : "border border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              {detalle.state === "open" ? "Abierto" : "Cerrado"}
            </span>
            <span>#{detalle.number}</span>
            {detalle.user && (
              <span className="inline-flex items-center gap-1.5">
                <Avatar actor={detalle.user} />
                {detalle.user.login}
              </span>
            )}
            <span>· {formatFechaHora(detalle.created_at)}</span>
          </div>

          {detalle.labels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {detalle.labels.map((l) => (
                <span
                  key={l.name}
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `#${l.color}26`,
                    color: `#${l.color}`,
                    border: `1px solid #${l.color}55`,
                  }}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}

          {detalle.assignees.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <span>Asignados:</span>
              <div className="flex items-center gap-1.5">
                {detalle.assignees.map((a) => (
                  <span key={a.login} className="inline-flex items-center gap-1">
                    <Avatar actor={a} />
                    {a.login}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 whitespace-pre-wrap rounded-lg border border-white/5 bg-ink-850 p-3 text-sm text-slate-300">
            {detalle.body?.trim() || "Sin descripción."}
          </div>

          <a
            href={detalle.html_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs font-medium text-brand-400 hover:underline"
          >
            Abrir en GitHub ↗
          </a>

          <div className="mt-5 border-t border-white/5 pt-4">
            <h4 className="mb-2 text-sm font-semibold text-white">
              Comentarios{comentarios.length > 0 ? ` (${comentarios.length})` : ""}
            </h4>
            {comentarios.length === 0 ? (
              <p className="text-xs text-slate-500">Sin comentarios.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {comentarios.map((c) => (
                  <div key={c.id} className="rounded-lg border border-white/5 bg-ink-850 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
                      {c.user && <Avatar actor={c.user} />}
                      <span className="font-medium text-slate-300">
                        {c.user?.login ?? "desconocido"}
                      </span>
                      <span>· {formatFechaHora(c.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-300">
                      {c.body?.trim() || "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!pending && error && fallbackUrl && (
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs font-medium text-brand-400 hover:underline"
        >
          Abrir en GitHub ↗
        </a>
      )}
    </div>
  );
}

export function IssueDetailModal({
  proyectoId,
  issueNumber,
  title,
  fallbackUrl,
  onClose,
}: {
  proyectoId: string;
  issueNumber: number;
  title?: string;
  fallbackUrl: string | null;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-2xl" zIndexClassName="z-[60]">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-bold text-white">{title ?? `Issue #${issueNumber}`}</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          ✕
        </button>
      </div>
      <div className="mt-2">
        <IssueDetailContent
          proyectoId={proyectoId}
          issueNumber={issueNumber}
          fallbackUrl={fallbackUrl}
        />
      </div>
    </Modal>
  );
}
