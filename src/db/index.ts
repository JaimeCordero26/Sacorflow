import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

// Drizzle client bound to the request's D1 binding. Call inside route handlers /
// server components (needs the Cloudflare request context).
export function getDb() {
  const { env } = getCloudflareContext();
  return drizzle(env.DB, { schema });
}

// For code paths that already hold `env` (Durable Object, custom worker).
export function dbFromEnv(env: CloudflareEnv) {
  return drizzle(env.DB, { schema });
}

export { schema };
