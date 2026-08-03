import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/db";
import { githubCuentas } from "@/db/schema";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const db = getDb();
  const gh = await db
    .select({ login: githubCuentas.githubLogin, avatar: githubCuentas.avatarUrl })
    .from(githubCuentas)
    .where(eq(githubCuentas.usuarioId, session.uid))
    .get();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm font-black tracking-tight"
          >
            <span className="h-6 w-6 rounded-lg bg-brand-gradient shadow-neon" />
            <span>
              <span className="text-gradient">Sacor</span>
              <span className="text-white">Tech</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/admin">Inicio</NavLink>
            <NavLink href="/admin/kanban">Tablero</NavLink>
            <NavLink href="/admin/bugs">Errores</NavLink>
            <NavLink href="/admin/clientes">Clientes</NavLink>
            <NavLink href="/admin/perfil">Perfil</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {gh ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-xs text-brand-300 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {gh.login}
              </span>
            ) : (
              <Link
                href="/admin/perfil"
                className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400 hover:text-white sm:inline-flex"
              >
                Conectar GitHub
              </Link>
            )}
            <span className="hidden text-sm text-slate-400 sm:inline">
              {session.nombre}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
    >
      {children}
    </Link>
  );
}
