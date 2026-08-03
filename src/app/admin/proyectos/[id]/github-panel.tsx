"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearRepoParaIdea,
  vincularRepoExistente,
  refrescarProgreso,
} from "../../actions";

export function GithubPanel({
  proyectoId,
  repoGithub,
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
  const [linking, setLinking] = useState(false);
  const [repo, setRepo] = useState(repoGithub ?? "");

  function crearRepo() {
    setError(null);
    start(async () => {
      const res = await crearRepoParaIdea(proyectoId);
      if (!res.ok) setError(res.error ?? "Error");
      router.refresh();
    });
  }

  function linkExisting() {
    setError(null);
    start(async () => {
      const res = await vincularRepoExistente(proyectoId, repo);
      if (!res.ok) {
        setError(res.error ?? "Error");
      } else {
        setLinking(false);
      }
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
            <strong className="text-slate-200"> creador de la idea</strong>, o
            vincula uno que ya exista.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={crearRepo}
              disabled={pending || !creadorLogin}
              className="btn-primary"
            >
              {pending ? "Creando…" : "Crear repositorio"}
            </button>
            <button
              onClick={() => setLinking((v) => !v)}
              disabled={!creadorLogin}
              className="btn-ghost"
            >
              Vincular repo existente
            </button>
          </div>
          {!creadorLogin && (
            <p className="mt-2 text-xs text-amber-400">
              El creador de la idea debe conectar su GitHub en Perfil antes de
              crear o vincular un repo.
            </p>
          )}
          {creadorLogin && !linking && (
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

      {/* Vincular repo existente por OAuth (sin Installation ID) */}
      {linking && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <label className="block">
            <span className="label">Repositorio existente (owner/repo o URL)</span>
            <input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="JaimeCordero26/mi-repo"
              autoFocus
              className="input"
            />
          </label>
          <p className="mt-1.5 text-xs text-slate-500">
            Debe pertenecer a{" "}
            <span className="font-mono">@{creadorLogin}</span> o ser accesible
            con su cuenta.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={linkExisting}
              disabled={pending || !repo.trim()}
              className="btn-primary"
            >
              {pending ? "Vinculando…" : "Vincular y calcular"}
            </button>
            <button
              type="button"
              onClick={() => setLinking(false)}
              className="btn-ghost"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Cuando ya hay repo, permitir cambiarlo */}
      {repoGithub && !linking && (
        <button
          onClick={() => {
            setRepo("");
            setLinking(true);
          }}
          className="mt-4 text-xs text-slate-500 hover:text-slate-300"
        >
          Vincular otro repo ›
        </button>
      )}
    </section>
  );
}
