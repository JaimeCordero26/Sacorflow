import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { dbFromEnv } from "@/db";
import { mensajesChat, proyectos } from "@/db/schema";
import { newId } from "@/lib/ids";
import { notifyPartners } from "@/lib/notifications";
import type { ChatAuthorType, ChatMessage } from "@/entities/chat/model/types";

// One ChatRoom per project (named by project id). Holds live WebSocket
// connections for the client (public token) and the partners (admin). Messages
// are persisted to D1 so history survives DO hibernation/restart.
//
// The custom worker (worker.ts) authenticates every upgrade BEFORE forwarding
// here, and stamps identity headers. The DO trusts those headers.

interface SocketMeta {
  role: ChatAuthorType;
  name: string;
  authorId: string | null;
  projectId: string;
}

export class ChatRoom extends DurableObject<CloudflareEnv> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const meta: SocketMeta = {
      role: (request.headers.get("X-Chat-Role") as SocketMeta["role"]) ?? "cliente",
      name: request.headers.get("X-Chat-Author-Name") ?? "Cliente",
      authorId: request.headers.get("X-Chat-Author-Id") || null,
      projectId: request.headers.get("X-Chat-Project-Id") ?? "",
    };

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Hibernation API: the runtime can evict the DO from memory between
    // messages and rehydrate the attachment on the next event.
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(meta);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const meta = ws.deserializeAttachment() as SocketMeta | null;
    if (!meta) return;

    let parsed: { type?: string; text?: string };
    try {
      parsed = JSON.parse(typeof raw === "string" ? raw : "");
    } catch {
      return;
    }
    if (parsed.type !== "message") return;

    const text = (parsed.text ?? "").trim();
    if (!text || text.length > 4000) return;

    const msg: ChatMessage = {
      id: newId(),
      authorType: meta.role,
      authorName: meta.role === "cliente" ? "Cliente" : meta.name,
      text,
      createdAt: new Date().toISOString(),
    };

    // Persist to D1.
    const db = dbFromEnv(this.env);
    await db.insert(mensajesChat).values({
      id: msg.id,
      proyectoId: meta.projectId,
      autorTipo: msg.authorType,
      autorId: meta.authorId,
      autorNombre: msg.authorName,
      texto: msg.text,
      // Client messages start unread (for the partner inbox); partner messages
      // are considered read.
      leido: meta.role === "socio",
      creadoEn: msg.createdAt,
    });

    // Broadcast to every live socket in this room.
    this.broadcast(msg);

    // Notify partners when the CLIENT writes.
    if (meta.role === "cliente") {
      const proj = await db
        .select({ nombre: proyectos.nombre })
        .from(proyectos)
        .where(eq(proyectos.id, meta.projectId))
        .get();
      this.ctx.waitUntil(
        notifyPartners(
          {
            title: `Nuevo mensaje del cliente`,
            body: `${proj?.nombre ?? "Proyecto"}: ${text.slice(0, 200)}`,
          },
          this.env,
        ),
      );
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
  }

  private broadcast(msg: ChatMessage): void {
    const payload = JSON.stringify({ type: "message", ...msg });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        /* stale socket */
      }
    }
  }
}
