import { requireSession } from "@/lib/auth";
import { getProfileData } from "@/server/services/profile.service";
import { GithubAccountCard, GithubMark } from "@/entities/github-account/ui/GithubAccountCard";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession();
  const { githubAccount } = await getProfileData(session.uid);

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

        {githubAccount ? (
          <GithubAccountCard account={githubAccount} />
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
