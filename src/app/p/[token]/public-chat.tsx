"use client";

import { ChatBox } from "@/components/chat-box";
import type { ChatMessage } from "@/entities/chat/model/types";

export function PublicChat({
  token,
  history,
}: {
  token: string;
  history: ChatMessage[];
}) {
  return (
    <ChatBox
      query={`token=${encodeURIComponent(token)}`}
      history={history}
      mine="cliente"
      title="Chatea con tu equipo"
      className="h-[60vh]"
    />
  );
}
