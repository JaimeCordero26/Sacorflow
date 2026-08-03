"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearRepoParaIdea,
  vincularGithub,
  refrescarProgreso,
} from "../../actions";

export function GithubPanel({
  proyectoId,
  repoGithub,
  installationId,
  milestoneId,
  milestoneTitulo,
  creadorLogin,
}: {
  proyectoId: string;
  repoGithub: string | null;
  installationId: number | null;
  milestoneId: number | null;
  milestoneTitulo: string | null;
  creadorLogin: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);

  const [repo, setRepo] = useState(repoGithub ?? "");
  const [inst, setInst] = useState(installationId?.toString() ?? "");
  const [ms, setMs] = useState(milestoneId?.toString() ?? "");
  const [msTitle, setMsTitle] = useState(milestoneTitulo ?? "");

  function crearRepo() {
    setError(null);
    start(async () => {
      const res = await crearRepoParaIdea(proyectoId);
      if (!res.ok) setError(res.error ?? "Error");
      router.refresh();
    });
  }

  function saveManual() {
    start(async () => {
      await vincularGithub(proyectoId, {
        repoGithub: repo,
        installationId: Number(inst),
        milestoneId: ms ? Number(ms) : null,
        milestoneTitulo: msTitle || null,
      });
      router.refresh();
    });
  }

  function refresh() {
    start(async () => {
      await refrescarProgreso(proyectoId);
      router.refresh();
    });
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">GitHub</h2>
        {repoGithub && (
          <button
            onClick={refresh}
            disabled={pending}
            className="text-sm font-medium text-brand-400 hover:underline disabled:opacity-50"
          >
            Recalcular progreso
          </button>
        )}
      </div>

      {repoGithub ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/5 px-3 py-2.5">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          <a
            href={`https://github.com/${repoGithub}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-brand-300 hover:underline"
          >
            {repoGithub}
          </a>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-slate-400">
            Cuando la idea esté lista, crea el repositorio en la cuenta del
            <strong className="text-slate-200"> creador de la idea</strong>.
          </p>
          <button
            onClick={crearRepo}
            disabled={pending || !creadorLogin}
            className="btn-primary mt-3"
          >
            {pending ? "Creando…" : "Crear repositorio"}
          </button>
          {!creadorLogin && (
            <p className="mt-2 text-xs text-amber-400">
              El creador de la idea debe conectar su GitHub en Perfil antes de
              crear el repo.
            </p>
          )}
          {creadorLogin && (
            <p className="mt-2 text-xs text-slate-500">
              Se creará como <span className="font-mono">@{creadorLogin}</span> ·
              privado.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-sm text-pink-400">
          {error}
        </p>
      )}

      <button
        onClick={() => setAdvanced((v) => !v)}
        className="mt-4 text-xs text-slate-500 hover:text-slate-300"
      >
        {advanced ? "Ocultar" : "Vincular repo existente (avanzado) ›"}
      </button>

      {advanced && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Repositorio (owner/repo)">
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="sacortech/proyecto-x"
                className="input"
              />
            </Field>
            <Field label="Installation ID">
              <input
                value={inst}
                onChange={(e) => setInst(e.target.value)}
                placeholder="12345678"
                inputMode="numeric"
                className="input"
              />
            </Field>
            <Field label="Milestone ID (opcional)">
              <input
                value={ms}
                onChange={(e) => setMs(e.target.value)}
                inputMode="numeric"
                className="input"
              />
            </Field>
            <Field label="Milestone título (opcional)">
              <input
                value={msTitle}
                onChange={(e) => setMsTitle(e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <button
            onClick={saveManual}
            disabled={pending || !repo || !inst}
            className="btn-ghost mt-3"
          >
            Guardar y calcular
          </button>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
