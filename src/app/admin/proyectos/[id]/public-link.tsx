"use client";

import { useEffect, useState } from "react";

export function PublicLink({
  token,
  activo,
}: {
  token: string;
  activo: boolean;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/p/${token}`);
  }, [token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-slate-300">
        Link público del cliente
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Compártelo con el cliente.{" "}
        {activo ? "Está activo." : "Está desactivado ahora mismo."}
      </p>
      <div className="mt-3 flex gap-2">
        <input readOnly value={url} className="input flex-1 truncate font-mono" />
        <button onClick={copy} className="btn-ghost shrink-0">
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
    </section>
  );
}
