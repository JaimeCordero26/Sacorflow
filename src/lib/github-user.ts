// GitHub App user-to-server OAuth: cada socio conecta su cuenta y obtenemos un
// user access token. Con ese token creamos el repo en SU cuenta, issues, webhook
// y leemos el progreso. Los tokens se guardan cifrados (AES-GCM) en D1.

import { eq } from "drizzle-orm";
import { dbFromEnv } from "@/db";
import { githubCuentas, usuarios } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { newId } from "@/lib/ids";

const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "SacorTech-Dashboard",
  "X-GitHub-Api-Version": "2022-11-28",
};

export interface GithubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string | null;
  email?: string | null;
}

// ¿Este login de GitHub está en la lista blanca de socios?
export function isAllowed(env: CloudflareEnv, login: string): boolean {
  const allowed = (env.GITHUB_ALLOWED_LOGINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.length > 0 && allowed.includes(login.toLowerCase());
}

// Encuentra el usuario ligado a esta cuenta GitHub, o lo crea (login = GitHub).
export async function findOrCreateUsuario(
  env: CloudflareEnv,
  user: GithubUser,
): Promise<{ id: string; nombre: string; email: string }> {
  const db = dbFromEnv(env);

  const existing = await db
    .select({ usuarioId: githubCuentas.usuarioId })
    .from(githubCuentas)
    .where(eq(githubCuentas.githubUserId, user.id))
    .get();

  if (existing) {
    const u = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email })
      .from(usuarios)
      .where(eq(usuarios.id, existing.usuarioId))
      .get();
    if (u) return u;
  }

  const nuevo = {
    id: newId(),
    nombre: user.name || user.login,
    email: user.email || `${user.login}@users.noreply.github.com`,
    passwordHash: "github", // login por GitHub, sin contraseña
  };
  await db.insert(usuarios).values(nuevo);
  return { id: nuevo.id, nombre: nuevo.nombre, email: nuevo.email };
}

export interface TokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

// --- OAuth ---

export function authorizeUrl(
  env: CloudflareEnv,
  redirectUri: string,
  state: string,
): string {
  const p = new URLSearchParams({
    client_id: env.GITHUB_APP_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    state,
    // OAuth App: pide acceso a repos (crear repo/issues privados) + identidad.
    // GitHub App: ignora `scope` (usa los permisos definidos en la app).
    scope: "read:user repo",
    allow_signup: "false",
  });
  return `https://github.com/login/oauth/authorize?${p.toString()}`;
}

export async function exchangeCode(
  env: CloudflareEnv,
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_APP_CLIENT_ID,
      client_secret: env.GITHUB_APP_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  return (await res.json()) as TokenResponse;
}

async function refreshToken(
  env: CloudflareEnv,
  refresh: string,
): Promise<TokenResponse> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_APP_CLIENT_ID,
      client_secret: env.GITHUB_APP_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
  });
  return (await res.json()) as TokenResponse;
}

export async function fetchGithubUser(token: string): Promise<GithubUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: { ...GH_HEADERS, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET /user ${res.status}`);
  return (await res.json()) as GithubUser;
}

// Guarda (upsert) la cuenta GitHub del socio con tokens cifrados.
export async function saveCuenta(
  env: CloudflareEnv,
  usuarioId: string,
  tok: TokenResponse,
  user: GithubUser,
): Promise<void> {
  const db = dbFromEnv(env);
  const nowMs = Date.now();
  const tokenExp = tok.expires_in
    ? new Date(nowMs + tok.expires_in * 1000).toISOString()
    : null;
  const refreshExp = tok.refresh_token_expires_in
    ? new Date(nowMs + tok.refresh_token_expires_in * 1000).toISOString()
    : null;

  const row = {
    usuarioId,
    githubLogin: user.login,
    githubUserId: user.id,
    avatarUrl: user.avatar_url,
    accessTokenEnc: await encryptSecret(tok.access_token, env.SESSION_SECRET),
    tokenExp,
    refreshTokenEnc: tok.refresh_token
      ? await encryptSecret(tok.refresh_token, env.SESSION_SECRET)
      : null,
    refreshExp,
    scope: tok.scope ?? null,
  };

  await db
    .insert(githubCuentas)
    .values(row)
    .onConflictDoUpdate({ target: githubCuentas.usuarioId, set: row });
}

// Devuelve un user access token válido para el socio, refrescándolo si venció.
// null si el socio no conectó GitHub (o el refresh falló).
export async function getUserToken(
  env: CloudflareEnv,
  usuarioId: string,
): Promise<string | null> {
  const db = dbFromEnv(env);
  const cuenta = await db
    .select()
    .from(githubCuentas)
    .where(eq(githubCuentas.usuarioId, usuarioId))
    .get();
  if (!cuenta) return null;

  const expired =
    cuenta.tokenExp != null && new Date(cuenta.tokenExp).getTime() < Date.now();
  if (!expired) {
    return decryptSecret(cuenta.accessTokenEnc, env.SESSION_SECRET);
  }

  // Vencido: intentar refrescar.
  if (!cuenta.refreshTokenEnc) return null;
  const refresh = await decryptSecret(cuenta.refreshTokenEnc, env.SESSION_SECRET);
  if (!refresh) return null;
  const tok = await refreshToken(env, refresh);
  if (!tok.access_token) return null;
  await saveCuenta(env, usuarioId, tok, {
    login: cuenta.githubLogin,
    id: cuenta.githubUserId,
    avatar_url: cuenta.avatarUrl ?? "",
  });
  return tok.access_token;
}

// --- REST helpers con user token ---

async function ghFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { ...GH_HEADERS, Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`GitHub ${path} ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export interface Repo {
  full_name: string; // "owner/repo"
  html_url: string;
  owner: { login: string };
  name: string;
}

export async function createRepo(
  token: string,
  opts: { name: string; description?: string; private?: boolean },
): Promise<Repo> {
  return ghFetch<Repo>(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: opts.name,
      description: opts.description ?? "",
      private: opts.private ?? true,
      auto_init: true,
    }),
  });
}

// Verifica que el token tenga acceso al repo y devuelve sus datos.
// Lanza si no existe o el usuario no tiene permiso.
export async function getRepo(token: string, repo: string): Promise<Repo> {
  return ghFetch<Repo>(token, `/repos/${repo}`);
}

export async function createIssue(
  token: string,
  repo: string,
  opts: { title: string; body?: string },
): Promise<{ number: number; html_url: string }> {
  return ghFetch(token, `/repos/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify({ title: opts.title, body: opts.body ?? "" }),
  });
}

export async function createWebhook(
  token: string,
  repo: string,
  opts: { url: string; secret: string },
): Promise<void> {
  await ghFetch(token, `/repos/${repo}/hooks`, {
    method: "POST",
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["issues", "push", "milestone"],
      config: {
        url: opts.url,
        content_type: "json",
        secret: opts.secret,
        insecure_ssl: "0",
      },
    }),
  });
}

// Progreso = issues cerrados / totales (excluye PRs). Usa el user token.
export async function progressWithToken(
  token: string,
  repo: string,
): Promise<{ pct: number; closed: number; total: number }> {
  const issues = await ghFetch<Array<{ state: string; pull_request?: unknown }>>(
    token,
    `/repos/${repo}/issues?state=all&per_page=100`,
  );
  const real = issues.filter((i) => !i.pull_request);
  const closed = real.filter((i) => i.state === "closed").length;
  const total = real.length;
  return { closed, total, pct: total === 0 ? 0 : Math.round((closed / total) * 100) };
}
