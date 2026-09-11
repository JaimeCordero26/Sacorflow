"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { createTaskAction } from "@/app/admin/proyectos/[id]/sprint-actions";

export function CreateTaskForm({
  projectId,
  sprintId,
  hasRepo,
}: {
  projectId: string;
  sprintId: string | null;
  hasRepo: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

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

  function close() {
    if (!pending) setOpen(false);
  }

  return (
    <Modal onClose={close}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-bold text-white">Nueva tarea</h3>
        <button onClick={close} className="text-slate-500 hover:text-white">
          ✕
        </button>
      </div>
      {hasRepo && (
        <p className="mt-1 text-xs text-slate-500">
          Se creará también como issue en el repo de GitHub del proyecto.
        </p>
      )}

      <form
        action={async (fd) => {
          const title = String(fd.get("title") ?? "");
          const description = String(fd.get("description") ?? "");
          setPending(true);
          await createTaskAction(projectId, sprintId, title, description);
          setPending(false);
          setOpen(false);
        }}
        className="mt-4 flex flex-col gap-3"
      >
        <div>
          <label className="label">Título</label>
          <input
            name="title"
            placeholder="Ej. Configurar autenticación"
            required
            autoFocus
            className="input"
          />
        </div>
        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea
            name="description"
            placeholder="Detalles, criterios de aceptación…"
            rows={5}
            className="input"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button disabled={pending} className="btn-primary flex-1">
            {pending ? "Creando…" : "Crear"}
          </button>
          <button type="button" disabled={pending} onClick={close} className="btn-ghost">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
