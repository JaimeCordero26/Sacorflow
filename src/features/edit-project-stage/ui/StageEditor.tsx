"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStageAction } from "@/app/admin/actions/proyectos";

export function StageEditor({
  projectId,
  currentStage,
  stages,
}: {
  projectId: string;
  currentStage: string | null;
  stages: string[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentStage ?? "");
  const [saving, setSaving] = useState(false);

  async function save(next: string) {
    setValue(next);
    if (!next) return;
    setSaving(true);
    await updateStageAction(projectId, next);
    setSaving(false);
    router.refresh();
  }

  return (
    <div>
      <label className="label">Etapa actual</label>
      <select
        value={value}
        onChange={(e) => save(e.target.value)}
        disabled={saving}
        className="input"
      >
        <option value="">— Selecciona —</option>
        {stages.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {stages.length === 0 && (
        <p className="mt-1 text-xs text-amber-400">
          No hay etapas configuradas. Crea etapas para poder asignarlas.
        </p>
      )}
    </div>
  );
}
