// Custom Worker entry (set as `main` in wrangler.jsonc).
//
//  1. Re-exports the ChatRoom Durable Object so wrangler can bind it.
//  2. Intercepts WebSocket upgrades on /api/chat and routes them to the right
//     ChatRoom DO after authenticating — Next.js/OpenNext cannot handle WS.
//  3. Delegates every other request to the OpenNext-generated handler.

// @ts-ignore generated at build time by `opennextjs-cloudflare build`
import { default as openNextHandler } from "./.open-next/worker.js";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { proyectos } from "./src/db/schema";
import { SESSION_COOKIE, verifySession } from "./src/lib/session";

export { ChatRoom } from "./src/durable-objects/chat-room";

function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("Cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}

async function handleChatUpgrade(
  request: Request,
  env: CloudflareEnv,
): Promise<Response> {
  const url = new URL(request.url);
  const db = drizzle(env.DB);

  const token = url.searchParams.get("token");
  const projectParam = url.searchParams.get("project");

  let projectId: string;
  let role: "cliente" | "socio";
  let authorName = "Cliente";
  let authorId = "";

  if (token) {
    // Client side: authenticated purely by the project's public token.
    const proj = await db
      .select({ id: proyectos.id, activo: proyectos.activo })
      .from(proyectos)
      .where(eq(proyectos.tokenPublico, token))
      .get();
    if (!proj || !proj.activo) {
      return new Response("Forbidden", { status: 403 });
    }
    projectId = proj.id;
    role = "cliente";
  } else {
    // Partner side: authenticated by the signed session cookie.
    const session = await verifySession(
      getCookie(request, SESSION_COOKIE),
      env.SESSION_SECRET,
    );
    if (!session || !projectParam) {
      return new Response("Unauthorized", { status: 401 });
    }
    const proj = await db
      .select({ id: proyectos.id })
      .from(proyectos)
      .where(eq(proyectos.id, projectParam))
      .get();
    if (!proj) return new Response("Not found", { status: 404 });
    projectId = proj.id;
    role = "socio";
    authorName = session.nombre;
    authorId = session.uid;
  }

  // Forward the upgrade to the per-project ChatRoom DO with stamped identity.
  const id = env.CHAT_ROOM.idFromName(projectId);
  const stub = env.CHAT_ROOM.get(id);

  const headers = new Headers(request.headers);
  headers.set("X-Chat-Role", role);
  headers.set("X-Chat-Author-Name", authorName);
  headers.set("X-Chat-Author-Id", authorId);
  headers.set("X-Chat-Project-Id", projectId);

  return stub.fetch(new Request(request.url, { headers, method: request.method }));
}

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (
      url.pathname === "/api/chat" &&
      request.headers.get("Upgrade") === "websocket"
    ) {
      return handleChatUpgrade(request, env);
    }
    return openNextHandler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareEnv>;
