"use client";

import { useState } from "react";
import { crearTarea } from "../sprint-actions";

export function NewTareaForm({
  proyectoId,
  sprintId,
}: {
  proyectoId: string;
  sprintId: string | null;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-white/15 px-3 py-2 text-sm text-slate-400 transition hover:border-brand-500/50 hover:text-brand-300"
      >
        + Nueva tarea
      </button>
    );
  }
  return (
    <form
      action={async (fd) => {
        const titulo = String(fd.get("titulo") ?? "");
        const descripcion = String(fd.get("descripcion") ?? "");
        await crearTarea(proyectoId, sprintId, titulo, descripcion);
        setOpen(false);
      }}
      className="rounded-lg border border-white/10 bg-ink-850 p-3"
    >
      <input name="titulo" placeholder="Título" required autoFocus className="input" />
      <textarea
        name="descripcion"
        placeholder="Descripción (opcional)"
        rows={2}
        className="input mt-2"
      />
      <div className="mt-2 flex gap-2">
        <button className="btn-primary flex-1">Crear</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
