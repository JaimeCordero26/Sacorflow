import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { signState } from "@/lib/oauth-state";
import { authorizeUrl } from "@/lib/github-user";

export const dynamic = "force-dynamic";

// Inicia "Entrar con GitHub". No requiere sesión: ES el login.
export async function GET(req: NextRequest) {
  const { env } = getCloudflareContext();
  if (!env.GITHUB_APP_CLIENT_ID || !env.GITHUB_APP_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "GitHub OAuth no configurado (falta CLIENT_ID/SECRET)" },
      { status: 500 },
    );
  }
  const redirectUri = new URL("/api/github/callback", req.url).toString();
  const state = await signState("", env.SESSION_SECRET); // sin uid: es login
  return NextResponse.redirect(authorizeUrl(env, redirectUri, state));
}
