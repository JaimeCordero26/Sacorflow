import type { Config } from "drizzle-kit";

// Drizzle generates SQL migrations into drizzle/migrations, which Wrangler then
// applies to D1 via `wrangler d1 migrations apply sacortech-db`.
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  driver: "d1-http", // metadata only; actual apply is done through Wrangler.
} satisfies Config;
