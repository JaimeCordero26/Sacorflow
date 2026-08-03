import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyState } from "@/lib/oauth-state";
import {
  exchangeCode,
  fetchGithubUser,
  findOrCreateUsuario,
  isAllowed,
  saveCuenta,
} from "@/lib/github-user";
import { signSession, sessionCookieString } from "@/lib/session";

export const dynamic = "force-dynamic";

// Callback del OAuth de GitHub. Valida el state, canjea el code, aplica la
// lista blanca, crea/encuentra el usuario, guarda su token e inicia sesión.
export async function GET(req: NextRequest) {
  const { env } = getCloudflareContext();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const parsed = await verifyState(state, env.SESSION_SECRET);
  if (!parsed || !code) {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }

  const redirectUri = new URL("/api/github/callback", req.url).toString();
  const tok = await exchangeCode(env, code, redirectUri);
  if (!tok.access_token) {
    return NextResponse.redirect(new URL("/login?error=token", req.url));
  }

  const ghUser = await fetchGithubUser(tok.access_token);

  // Lista blanca: solo los socios permitidos entran.
  if (!isAllowed(env, ghUser.login)) {
    return NextResponse.redirect(new URL("/login?error=denied", req.url));
  }

  const usuario = await findOrCreateUsuario(env, ghUser);
  await saveCuenta(env, usuario.id, tok, ghUser);

  const sessionTok = await signSession(
    { uid: usuario.id, nombre: usuario.nombre, email: usuario.email },
    env.SESSION_SECRET,
  );

  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.headers.set("Set-Cookie", sessionCookieString(sessionTok));
  return res;
}
