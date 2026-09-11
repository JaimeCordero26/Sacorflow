"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearBug } from "../actions/bugs";
import { PRIORIDAD_OPTIONS, PRIO_META } from "./types";

export function BugForm({
  proyectos,
  onClose,
}: {
  proyectos: { id: string; nombre: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) =>
        start(async () => {
          await crearBug(fd);
          onClose();
          router.refresh();
        })
      }
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
            {PRIORIDAD_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {PRIO_META[p].label}
              </option>
            ))}
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
  );
}
