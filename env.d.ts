// Manually-maintained binding types, kept in sync with wrangler.jsonc.
// `pnpm cf:typegen` regenerates a richer version into cloudflare-env.d.ts.

interface RateLimitResult {
  success: boolean;
}
interface RateLimiter {
  limit(opts: { key: string }): Promise<RateLimitResult>;
}

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    CHAT_ROOM: DurableObjectNamespace;
    FILES: R2Bucket;
    AI: Ai;
    PUBLIC_RATE_LIMITER: RateLimiter;

    APP_NAME: string;
    APP_URL?: string; // origen público, p.ej. https://dashboard.sacortech.xyz (para webhooks)

    // Secrets (.dev.vars locally / `wrangler secret put` in prod)
    SESSION_SECRET: string;

    GITHUB_APP_ID?: string;
    GITHUB_APP_CLIENT_ID?: string;
    GITHUB_APP_CLIENT_SECRET?: string;
    GITHUB_APP_PRIVATE_KEY?: string;
    GITHUB_WEBHOOK_SECRET?: string;
    // Lista blanca de logins GitHub que pueden entrar (los dos socios), coma-separada.
    GITHUB_ALLOWED_LOGINS?: string;

    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
  }
}

export {};
