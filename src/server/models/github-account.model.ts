import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { githubCuentas } from "@/db/schema";

export interface GithubAccount {
  login: string;
  avatarUrl: string | null;
  connectedAt: string;
}

// Nota: la tabla sigue en español (`github_cuentas`) — traducir el esquema de
// la base de datos requiere una migración aparte, ya que es compartida por
// toda la app. Este modelo es el único punto que traduce esas columnas al
// shape en inglés que usa el resto del código.
function toGithubAccount(row: typeof githubCuentas.$inferSelect): GithubAccount {
  return {
    login: row.githubLogin,
    avatarUrl: row.avatarUrl,
    connectedAt: row.creadoEn,
  };
}

export async function findGithubAccountByUserId(
  db: ReturnType<typeof getDb>,
  userId: string,
): Promise<GithubAccount | null> {
  const row = await db
    .select()
    .from(githubCuentas)
    .where(eq(githubCuentas.usuarioId, userId))
    .get();
  return row ? toGithubAccount(row) : null;
}

export async function deleteGithubAccount(
  db: ReturnType<typeof getDb>,
  userId: string,
): Promise<void> {
  await db.delete(githubCuentas).where(eq(githubCuentas.usuarioId, userId));
}
