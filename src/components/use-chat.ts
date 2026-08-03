"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  autorTipo: "cliente" | "socio";
  autorNombre: string;
  texto: string;
  creadoEn: string;
}

type ConnState = "connecting" | "open" | "closed";

// Shared WebSocket chat client. `query` is the auth query string, e.g.
// "token=..." (client) or "project=..." (partner). History is server-rendered
// and passed in; the socket only streams new messages.
export function useChat(query: string, historial: ChatMessage[]) {
  const [messages, setMessages] = useState<ChatMessage[]>(historial);
  const [state, setState] = useState<ConnState>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const seen = useRef(new Set(historial.map((m) => m.id)));

  const connect = useCallback(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${proto}://${window.location.host}/api/chat?${query}`,
    );
    wsRef.current = ws;
    setState("connecting");

    ws.onopen = () => {
      retryRef.current = 0;
      setState("open");
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "message" && !seen.current.has(data.id)) {
          seen.current.add(data.id);
          setMessages((prev) => [...prev, data as ChatMessage]);
        }
      } catch {
        /* ignore malformed frame */
      }
    };
    ws.onclose = () => {
      setState("closed");
      // Exponential backoff reconnect (max ~10s).
      const delay = Math.min(1000 * 2 ** retryRef.current++, 10000);
      setTimeout(connect, delay);
    };
    ws.onerror = () => ws.close();
  }, [query]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback((texto: string) => {
    const t = texto.trim();
    const ws = wsRef.current;
    if (!t || !ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type: "message", texto: t }));
    return true;
  }, []);

  return { messages, state, send };
}
