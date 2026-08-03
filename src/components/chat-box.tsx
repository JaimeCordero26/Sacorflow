"use client";

import { useEffect, useRef, useState } from "react";
import { useChat, type ChatMessage } from "./use-chat";

// Reusable chat UI. `mine` decides which side a message renders on.
export function ChatBox({
  query,
  historial,
  mine,
  title,
  className,
}: {
  query: string;
  historial: ChatMessage[];
  mine: "cliente" | "socio";
  title?: string;
  className?: string;
}) {
  const { messages, state, send } = useChat(query, historial);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (send(text)) setText("");
  }

  return (
    <div className={`card flex flex-col overflow-hidden ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">
          {title ?? "Chat"}
        </h2>
        <span
          className={`flex items-center gap-1.5 text-xs ${
            state === "open" ? "text-brand-300" : "text-slate-500"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              state === "open" ? "bg-brand-500 shadow-neon" : "bg-slate-600"
            }`}
          />
          {state === "open" ? "En línea" : "Conectando…"}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No hay mensajes todavía. Escribe el primero.
          </p>
        )}
        {messages.map((m) => {
          const isMine = m.autorTipo === mine;
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  isMine
                    ? "rounded-br-sm bg-brand-gradient-2 text-ink-950"
                    : "rounded-bl-sm border border-white/10 bg-white/5 text-slate-100"
                }`}
              >
                {!isMine && (
                  <div className="mb-0.5 text-xs font-semibold text-brand-300">
                    {m.autorNombre}
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                <time
                  className={`mt-1 block text-[10px] ${
                    isMine ? "text-ink-900/70" : "text-slate-500"
                  }`}
                >
                  {new Date(m.creadoEn).toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje…"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={state !== "open"}
          className="btn-primary shrink-0"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
