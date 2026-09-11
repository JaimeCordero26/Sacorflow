"use client";

import { ChatBox } from "@/components/chat-box";
import type { ChatMessage } from "@/entities/chat/model/types";

export function AdminChat({
  proyectoId,
  history,
}: {
  proyectoId: string;
  history: ChatMessage[];
}) {
  return (
    <ChatBox
      query={`project=${encodeURIComponent(proyectoId)}`}
      history={history}
      mine="socio"
      title="Chat con el cliente"
      className="h-[70vh] lg:sticky lg:top-20"
    />
  );
}
