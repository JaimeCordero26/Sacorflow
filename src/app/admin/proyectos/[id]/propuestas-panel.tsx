"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generarPropuestas,
  marcarPropuesta,
  crearIssuesAceptados,
} from "../../actions";

type Estado = "propuesto" | "aceptado" | "descartado";

interface Propuesta {
  id: string;
  titulo: string;
  cuerpo: string;
  estado: Estado;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
}

export function PropuestasPanel({
  proyectoId,
  tieneRepo,
  propuestas,
}: {
  proyectoId: string;
  tieneRepo: boolean;
  propuestas: Propuesta[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const activas = propuestas.filter((p) => p.estado !== "descartado");
  const aceptadasSinIssue = propuestas.filter(
    (p) => p.estado === "aceptado" && !p.githubIssueNumber,
  ).length;

  function desglosar() {
    setMsg(null);
    start(async () => {
      const res = await generarPropuestas(proyectoId);
      setMsg(res.ok ? `${res.n} propuestas generadas.` : (res.error ?? "Error"));
      router.refresh();
    });
  }

  function marcar(id: string, estado: Estado) {
    start(async () => {
      await marcarPropuesta(id, estado);
      router.refresh();
    });
  }

  function crearIssues() {
    setMsg(null);
    start(async () => {
      const res = await crearIssuesAceptados(proyectoId);
      setMsg(res.ok ? `${res.creados} issues creados en GitHub.` : (res.error ?? "Error"));
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
        <button onClick={desglosar} disabled={pending} className="btn-ghost">
          {pending
            ? "Procesando…"
            : propuestas.length
              ? "Regenerar"
              : "Desglosar con IA"}
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-500">
        La IA analiza la idea y los aportes y propone tareas. Acepta las que
        quieras y créalas como issues en GitHub.
      </p>

      {msg && (
        <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
          {msg}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {activas.length === 0 && (
          <p className="text-sm text-slate-500">
            Sin propuestas. Pulsa <em>Desglosar con IA</em>.
          </p>
        )}
        {activas.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg border p-3 transition ${
              p.estado === "aceptado"
                ? "border-brand-500/40 bg-brand-500/5"
                : "border-white/10 bg-ink-850"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{p.titulo}</p>
                {p.cuerpo && (
                  <p className="mt-0.5 text-xs text-slate-400">{p.cuerpo}</p>
                )}
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
                      marcar(p.id, p.estado === "aceptado" ? "propuesto" : "aceptado")
                    }
                    disabled={pending}
                    className={`badge border ${
                      p.estado === "aceptado"
                        ? "border-brand-500/50 bg-brand-500/20 text-brand-200"
                        : "border-white/10 bg-white/5 text-slate-300 hover:text-white"
                    }`}
                  >
                    {p.estado === "aceptado" ? "✓ Aceptado" : "Aceptar"}
                  </button>
                  <button
                    onClick={() => marcar(p.id, "descartado")}
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

      {activas.some((p) => p.estado === "aceptado") && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <button
            onClick={crearIssues}
            disabled={pending || !tieneRepo || aceptadasSinIssue === 0}
            className="btn-primary w-full"
          >
            {aceptadasSinIssue > 0
              ? `Crear ${aceptadasSinIssue} issue(s) en GitHub`
              : "Todos los aceptados ya están en GitHub"}
          </button>
          {!tieneRepo && (
            <p className="mt-2 text-xs text-amber-400">
              Crea el repositorio primero para publicar los issues.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
