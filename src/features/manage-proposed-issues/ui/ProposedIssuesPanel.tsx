"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAcceptedIssuesAction,
  generateProposalsAction,
  markProposalAction,
} from "@/app/admin/actions/propuestas";
import type { ProposalStatus, ProposedIssue } from "@/entities/proposed-issue/model/types";

export function ProposedIssuesPanel({
  projectId,
  hasRepo,
  proposals,
}: {
  projectId: string;
  hasRepo: boolean;
  proposals: ProposedIssue[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const active = proposals.filter((p) => p.status !== "descartado");
  const acceptedWithoutIssue = proposals.filter(
    (p) => p.status === "aceptado" && !p.githubIssueNumber,
  ).length;

  function breakdown() {
    setMessage(null);
    start(async () => {
      const res = await generateProposalsAction(projectId);
      setMessage(res.ok ? `${res.n} propuestas generadas.` : (res.error ?? "Error"));
      router.refresh();
    });
  }

  function mark(id: string, status: ProposalStatus) {
    start(async () => {
      await markProposalAction(id, status);
      router.refresh();
    });
  }

  function createIssues() {
    setMessage(null);
    start(async () => {
      const res = await createAcceptedIssuesAction(projectId);
      setMessage(res.ok ? `${res.creados} issues creados en GitHub.` : (res.error ?? "Error"));
      router.refresh();
    });
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="badge border border-violet-600/40 bg-violet-600/15 text-violet-300">
            IA
          </span>
          <h2 className="text-sm font-semibold text-slate-300">
            Desglose en issues
          </h2>
        </div>
        <button onClick={breakdown} disabled={pending} className="btn-ghost">
          {pending
            ? "Procesando…"
            : proposals.length
              ? "Regenerar"
              : "Desglosar con IA"}
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-500">
        La IA analiza la idea y los aportes y propone tareas. Acepta las que
        quieras y créalas como issues en GitHub.
      </p>

      {message && (
        <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
          {message}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {active.length === 0 && (
          <p className="text-sm text-slate-500">
            Sin propuestas. Pulsa <em>Desglosar con IA</em>.
          </p>
        )}
        {active.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg border p-3 transition ${
              p.status === "aceptado"
                ? "border-brand-500/40 bg-brand-500/5"
                : "border-white/10 bg-ink-850"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{p.title}</p>
                {p.body && <p className="mt-0.5 text-xs text-slate-400">{p.body}</p>}
                {p.githubIssueNumber && (
                  <a
                    href={p.githubIssueUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-medium text-brand-400 hover:underline"
                  >
                    #{p.githubIssueNumber} en GitHub ↗
                  </a>
                )}
              </div>
              {!p.githubIssueNumber && (
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() =>
                      mark(p.id, p.status === "aceptado" ? "propuesto" : "aceptado")
                    }
                    disabled={pending}
                    className={`badge border ${
                      p.status === "aceptado"
                        ? "border-brand-500/50 bg-brand-500/20 text-brand-200"
                        : "border-white/10 bg-white/5 text-slate-300 hover:text-white"
                    }`}
                  >
                    {p.status === "aceptado" ? "✓ Aceptado" : "Aceptar"}
                  </button>
                  <button
                    onClick={() => mark(p.id, "descartado")}
                    disabled={pending}
                    className="badge border border-white/10 bg-white/5 text-slate-500 hover:text-pink-400"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {active.some((p) => p.status === "aceptado") && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <button
            onClick={createIssues}
            disabled={pending || !hasRepo || acceptedWithoutIssue === 0}
            className="btn-primary w-full"
          >
            {acceptedWithoutIssue > 0
              ? `Crear ${acceptedWithoutIssue} issue(s) en GitHub`
              : "Todos los aceptados ya están en GitHub"}
          </button>
          {!hasRepo && (
            <p className="mt-2 text-xs text-amber-400">
              Crea el repositorio primero para publicar los issues.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
