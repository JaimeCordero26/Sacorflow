"use client";

import { ChatBox } from "@/components/chat-box";
import type { ChatMessage } from "@/components/use-chat";

export function AdminChat({
  proyectoId,
  historial,
}: {
  proyectoId: string;
  historial: ChatMessage[];
}) {
  return (
    <ChatBox
      query={`project=${encodeURIComponent(proyectoId)}`}
      historial={historial}
      mine="socio"
      title="Chat con el cliente"
      className="h-[70vh] lg:sticky lg:top-20"
    />
  );
}
