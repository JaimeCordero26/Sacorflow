import Link from "next/link";
import { formatDate } from "@/shared/lib/date";
import {
  PRIORITY_META,
  PRIORITY_OPTIONS,
  STATUS_META,
  STATUS_OPTIONS,
} from "@/entities/bug/model/types";
import type { Bug, Priority, Status } from "@/entities/bug/model/types";

export function BugRow({
  bug,
  pending,
  onUpdate,
  onRemove,
}: {
  bug: Bug;
  pending: boolean;
  onUpdate: (id: string, data: { status?: Status; priority?: Priority }) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-start ${
        bug.status === "resuelto" ? "opacity-60" : ""
      }`}
    >
      <span className={`badge h-fit shrink-0 border ${PRIORITY_META[bug.priority].cls}`}>
        {PRIORITY_META[bug.priority].label}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold text-white ${
            bug.status === "resuelto" ? "line-through" : ""
          }`}
        >
          {bug.title}
        </p>
        {bug.description && (
          <p className="mt-0.5 text-xs text-slate-400">{bug.description}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {bug.projectId ? (
            <Link
              href={`/admin/proyectos/${bug.projectId}`}
              className="rounded-full bg-white/5 px-2 py-0.5 text-brand-300 hover:underline"
            >
              {bug.projectName ?? "Proyecto"}
            </Link>
          ) : (
            <span className="rounded-full bg-white/5 px-2 py-0.5">Sin proyecto</span>
          )}
          <span>{formatDate(bug.createdAt)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={bug.priority}
          onChange={(e) => onUpdate(bug.id, { priority: e.target.value as Priority })}
          disabled={pending}
          className="input !w-auto !py-1 text-xs"
          aria-label="Prioridad"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_META[p].label}
            </option>
          ))}
        </select>
        <select
          value={bug.status}
          onChange={(e) => onUpdate(bug.id, { status: e.target.value as Status })}
          disabled={pending}
          className="input !w-auto !py-1 text-xs"
          aria-label="Estado"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <button
          onClick={() => onRemove(bug.id)}
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
