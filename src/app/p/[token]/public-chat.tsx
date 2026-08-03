"use client";

import { ChatBox } from "@/components/chat-box";
import type { ChatMessage } from "@/components/use-chat";

export function PublicChat({
  token,
  historial,
}: {
  token: string;
  historial: ChatMessage[];
}) {
  return (
    <ChatBox
      query={`token=${encodeURIComponent(token)}`}
      historial={historial}
      mine="cliente"
      title="Chatea con tu equipo"
      className="h-[60vh]"
    />
  );
}
