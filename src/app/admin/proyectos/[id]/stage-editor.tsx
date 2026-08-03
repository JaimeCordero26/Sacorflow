"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarEtapa } from "../../actions";

export function StageEditor({
  proyectoId,
  etapaActual,
  etapas,
}: {
  proyectoId: string;
  etapaActual: string | null;
  etapas: string[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(etapaActual ?? "");
  const [saving, setSaving] = useState(false);

  async function save(nueva: string) {
    setValue(nueva);
    if (!nueva) return;
    setSaving(true);
    await actualizarEtapa(proyectoId, nueva);
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
        {etapas.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
      {etapas.length === 0 && (
        <p className="mt-1 text-xs text-amber-400">
          No hay etapas configuradas. Crea etapas para poder asignarlas.
        </p>
      )}
    </div>
  );
}
