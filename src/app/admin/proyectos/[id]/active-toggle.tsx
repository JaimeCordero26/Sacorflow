"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarActivo } from "../../actions";

export function ActiveToggle({
  proyectoId,
  activo,
}: {
  proyectoId: string;
  activo: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(activo);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    start(async () => {
      await cambiarActivo(proyectoId, next);
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        on
          ? "border-brand-500/40 bg-brand-500/10 text-brand-300"
          : "border-white/10 bg-white/5 text-slate-500"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${on ? "bg-brand-500" : "bg-slate-600"}`}
      />
      {on ? "Link público activo" : "Link público desactivado"}
    </button>
  );
}
