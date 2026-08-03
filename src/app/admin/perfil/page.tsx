import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/db";
import { githubCuentas } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await requireSession();
  const db = getDb();
  const cuenta = await db
    .select()
    .from(githubCuentas)
    .where(eq(githubCuentas.usuarioId, session.uid))
    .get();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="heading text-2xl">Perfil</h1>
        <p className="mt-1 text-sm text-slate-400">
          {session.nombre} · {session.email}
        </p>
      </div>

      <section className="card p-6">
        <div className="flex items-center gap-2">
          <GithubMark />
          <h2 className="heading">Cuenta de GitHub</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Con esta cuenta se crean tus repositorios e issues.
        </p>

        {cuenta ? (
          <div className="mt-5 flex items-center gap-4">
            {cuenta.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cuenta.avatarUrl}
                alt={cuenta.githubLogin}
                className="h-12 w-12 rounded-full ring-2 ring-brand-500/40"
              />
            )}
            <div className="flex-1">
              <div className="font-semibold text-white">@{cuenta.githubLogin}</div>
              <div className="text-xs text-slate-500">
                Vinculada {new Date(cuenta.creadoEn).toLocaleDateString("es-MX")}
              </div>
            </div>
            <span className="badge border border-brand-500/30 bg-brand-500/10 text-brand-300">
              activa
            </span>
          </div>
        ) : (
          <p className="mt-5 text-sm text-amber-400">
            No hay cuenta de GitHub vinculada. Cierra sesión y vuelve a entrar con
            GitHub.
          </p>
        )}
      </section>
    </div>
  );
}

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
