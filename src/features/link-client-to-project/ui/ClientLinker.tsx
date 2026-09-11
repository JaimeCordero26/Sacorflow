"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  linkClientToProjectAction,
  unlinkClientFromProjectAction,
} from "@/app/admin/actions/clientes";

export function ClientLinker({
  projectId,
  allClients,
  linkedClients,
}: {
  projectId: string;
  allClients: { id: string; name: string }[];
  linkedClients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState("");

  const available = allClients.filter(
    (c) => !linkedClients.some((v) => v.id === c.id),
  );

  function link() {
    if (!selected) return;
    start(async () => {
      await linkClientToProjectAction(selected, projectId);
      setSelected("");
      router.refresh();
    });
  }

  function unlink(clientId: string) {
    start(async () => {
      await unlinkClientFromProjectAction(clientId, projectId);
      router.refresh();
    });
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-slate-300">Clientes</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {linkedClients.length === 0 && (
          <span className="text-sm text-slate-500">Sin clientes vinculados.</span>
        )}
        {linkedClients.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1 text-sm text-slate-200"
          >
            <Link href={`/admin/clientes/${c.id}`} className="hover:underline">
              {c.name}
            </Link>
            <button
              onClick={() => unlink(c.id)}
              disabled={pending}
              className="flex h-5 w-5 items-center justify-center rounded-full text-slate-500 hover:bg-white/10 hover:text-pink-400"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      {available.length > 0 && (
        <div className="mt-3 flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="input flex-1"
          >
            <option value="">Vincular cliente…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button onClick={link} disabled={pending || !selected} className="btn-ghost">
            Vincular
          </button>
        </div>
      )}
    </section>
  );
}
