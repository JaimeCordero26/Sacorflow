"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBugAction } from "@/app/admin/actions/bugs";
import { PRIORITY_META, PRIORITY_OPTIONS } from "@/entities/bug/model/types";
import type { ProjectOption } from "@/server/models/bug.model";

export function CreateBugForm({
  projects,
  onClose,
}: {
  projects: ProjectOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) =>
        start(async () => {
          await createBugAction(fd);
          onClose();
          router.refresh();
        })
      }
      className="card space-y-3 p-5"
    >
      <div>
        <label className="label">Título</label>
        <input name="title" required autoFocus placeholder="Qué falla" className="input" />
      </div>
      <div>
        <label className="label">Descripción (opcional)</label>
        <textarea
          name="description"
          rows={2}
          placeholder="Pasos, contexto, cómo reproducir…"
          className="input"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Prioridad</label>
          <select name="priority" defaultValue="media" className="input">
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Proyecto (opcional)</label>
          <select name="projectId" defaultValue="" className="input">
            <option value="">— Ninguno —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
