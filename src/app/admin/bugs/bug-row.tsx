import Link from "next/link";
import { formatFecha } from "@/lib/format";
import { ESTADO_META, ESTADO_OPTIONS, PRIORIDAD_OPTIONS, PRIO_META } from "./types";
import type { Bug, Estado, Prioridad } from "./types";

export function BugRow({
  bug: b,
  pending,
  onUpdate,
  onRemove,
}: {
  bug: Bug;
  pending: boolean;
  onUpdate: (id: string, data: { estado?: Estado; prioridad?: Prioridad }) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-start ${
        b.estado === "resuelto" ? "opacity-60" : ""
      }`}
    >
      <span className={`badge h-fit shrink-0 border ${PRIO_META[b.prioridad].cls}`}>
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
          <span>{formatFecha(b.creadoEn)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={b.prioridad}
          onChange={(e) => onUpdate(b.id, { prioridad: e.target.value as Prioridad })}
          disabled={pending}
          className="input !w-auto !py-1 text-xs"
          aria-label="Prioridad"
        >
          {PRIORIDAD_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {PRIO_META[p].label}
            </option>
          ))}
        </select>
        <select
          value={b.estado}
          onChange={(e) => onUpdate(b.id, { estado: e.target.value as Estado })}
          disabled={pending}
          className="input !w-auto !py-1 text-xs"
          aria-label="Estado"
        >
          {ESTADO_OPTIONS.map((e) => (
            <option key={e} value={e}>
              {ESTADO_META[e].label}
            </option>
          ))}
        </select>
        <button
          onClick={() => onRemove(b.id)}
          disabled={pending}
          className="text-slate-600 hover:text-pink-400"
          aria-label="Eliminar"
          title="Eliminar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
