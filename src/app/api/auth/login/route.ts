import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { usuarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";
import { signSession, sessionCookieString } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { env } = getCloudflareContext();
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
  }

  const db = getDb();
  const user = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .get();

  // Same generic error whether the user exists or the password is wrong.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 },
    );
  }

  const token = await signSession(
    { uid: user.id, nombre: user.nombre, email: user.email },
    env.SESSION_SECRET,
  );

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", sessionCookieString(token));
  return res;
}
