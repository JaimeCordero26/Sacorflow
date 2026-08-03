import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./session";

// Returns the current partner's session, or null. Use in server components /
// route handlers. Reads SESSION_SECRET from the Cloudflare env.
export async function getSession(): Promise<SessionPayload | null> {
  const { env } = getCloudflareContext();
  const secret = env.SESSION_SECRET;
  if (!secret) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token, secret);
}

// Enforces auth in /admin server components — redirects to /login if missing.
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
