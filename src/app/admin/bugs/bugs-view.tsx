"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearBug, actualizarBug, eliminarBug } from "../actions";

type Prioridad = "alta" | "media" | "baja";
type Estado = "abierto" | "en_progreso" | "resuelto";

interface Bug {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  estado: Estado;
  proyectoId: string | null;
  proyectoNombre: string | null;
  creadoEn: string;
  resueltoEn: string | null;
}

const PRIO_META: Record<Prioridad, { label: string; cls: string; rank: number }> = {
  alta: { label: "Alta", cls: "border-pink-500/40 bg-pink-500/15 text-pink-300", rank: 0 },
  media: { label: "Media", cls: "border-amber-500/40 bg-amber-500/15 text-amber-300", rank: 1 },
  baja: { label: "Baja", cls: "border-slate-500/40 bg-slate-500/15 text-slate-300", rank: 2 },
};

const ESTADO_META: Record<Estado, { label: string; rank: number }> = {
  abierto: { label: "Abierto", rank: 0 },
  en_progreso: { label: "En progreso", rank: 1 },
  resuelto: { label: "Resuelto", rank: 2 },
};

export function BugsView({
  bugs,
  proyectos,
}: {
  bugs: Bug[];
  proyectos: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [fEstado, setFEstado] = useState<"todos" | Estado>("todos");
  const [fPrio, setFPrio] = useState<"todas" | Prioridad>("todas");

  const abiertos = bugs.filter((b) => b.estado !== "resuelto").length;

  const visibles = useMemo(() => {
    return bugs
      .filter((b) => (fEstado === "todos" ? true : b.estado === fEstado))
      .filter((b) => (fPrio === "todas" ? true : b.prioridad === fPrio))
      .sort((a, b) => {
        // Resueltos al fondo; luego por prioridad; luego más recientes.
        const er = ESTADO_META[a.estado].rank - ESTADO_META[b.estado].rank;
        if (er !== 0) return er;
        const pr = PRIO_META[a.prioridad].rank - PRIO_META[b.prioridad].rank;
        if (pr !== 0) return pr;
        return b.creadoEn.localeCompare(a.creadoEn);
      });
  }, [bugs, fEstado, fPrio]);

  function update(id: string, data: { estado?: Estado; prioridad?: Prioridad }) {
    start(async () => {
      await actualizarBug(id, data);
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      await eliminarBug(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Errores</h1>
          <p className="mt-1 text-sm text-slate-400">
            {abiertos} sin resolver · prioriza y ataca por orden.
          </p>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="btn-primary">
          {open ? "Cerrar" : "+ Nuevo error"}
        </button>
      </div>

      {open && (
        <form
          action={async (fd) => {
            await crearBug(fd);
            setOpen(false);
            router.refresh();
          }}
          className="card space-y-3 p-5"
        >
          <div>
            <label className="label">Título</label>
            <input name="titulo" required autoFocus placeholder="Qué falla" className="input" />
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <textarea
              name="descripcion"
              rows={2}
              placeholder="Pasos, contexto, cómo reproducir…"
              className="input"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Prioridad</label>
              <select name="prioridad" defaultValue="media" className="input">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="label">Proyecto (opcional)</label>
              <select name="proyectoId" defaultValue="" className="input">
                <option value="">— Ninguno —</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button disabled={pending} className="btn-primary">
            {pending ? "Guardando…" : "Registrar error"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Filter
          label="Estado"
          value={fEstado}
          onChange={(v) => setFEstado(v as typeof fEstado)}
          options={[
            ["todos", "Todos"],
            ["abierto", "Abierto"],
            ["en_progreso", "En progreso"],
            ["resuelto", "Resuelto"],
          ]}
        />
        <Filter
          label="Prioridad"
          value={fPrio}
          onChange={(v) => setFPrio(v as typeof fPrio)}
          options={[
            ["todas", "Todas"],
            ["alta", "Alta"],
            ["media", "Media"],
            ["baja", "Baja"],
          ]}
        />
      </div>

      <div className="space-y-2">
        {visibles.length === 0 && (
          <p className="card p-8 text-center text-sm text-slate-500">
            Sin errores. Registra el primero con “+ Nuevo error”.
          </p>
        )}
        {visibles.map((b) => (
          <div
            key={b.id}
            className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-start ${
              b.estado === "resuelto" ? "opacity-60" : ""
            }`}
          >
            <span
              className={`badge h-fit shrink-0 border ${PRIO_META[b.prioridad].cls}`}
            >
              {PRIO_META[b.prioridad].label}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold text-white ${
                  b.estado === "resuelto" ? "line-through" : ""
                }`}
              >
                {b.titulo}
              </p>
              {b.descripcion && (
                <p className="mt-0.5 text-xs text-slate-400">{b.descripcion}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {b.proyectoId ? (
                  <Link
                    href={`/admin/proyectos/${b.proyectoId}`}
                    className="rounded-full bg-white/5 px-2 py-0.5 text-brand-300 hover:underline"
                  >
                    {b.proyectoNombre ?? "Proyecto"}
                  </Link>
                ) : (
                  <span className="rounded-full bg-white/5 px-2 py-0.5">Sin proyecto</span>
                )}
                <span>{new Date(b.creadoEn).toLocaleDateString("es-MX")}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select
                value={b.prioridad}
                onChange={(e) => update(b.id, { prioridad: e.target.value as Prioridad })}
                disabled={pending}
                className="input !w-auto !py-1 text-xs"
                aria-label="Prioridad"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
              <select
                value={b.estado}
                onChange={(e) => update(b.id, { estado: e.target.value as Estado })}
                disabled={pending}
                className="input !w-auto !py-1 text-xs"
                aria-label="Estado"
              >
                <option value="abierto">Abierto</option>
                <option value="en_progreso">En progreso</option>
                <option value="resuelto">Resuelto</option>
              </select>
              <button
                onClick={() => remove(b.id)}
                disabled={pending}
                className="text-slate-600 hover:text-pink-400"
                aria-label="Eliminar"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-slate-500">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input !w-auto !py-1 text-xs"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
