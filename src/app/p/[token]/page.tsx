import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { eventosProgreso, mensajesChat, proyectos } from "@/db/schema";
import { PublicChat } from "./public-chat";

export const dynamic = "force-dynamic";

// Generic unavailable page. Intentionally identical whether the token doesn't
// exist OR the project is inactive — never leak which case it is.
function Unavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-4 text-4xl">🔒</div>
        <h1 className="text-lg font-semibold text-white">
          Este proyecto ya no está disponible
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Si crees que es un error, contacta a tu equipo de SacorTech.
        </p>
      </div>
    </main>
  );
}

export default async function PublicProject({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { env } = getCloudflareContext();

  // Basic per-IP rate limit against token brute-forcing.
  const ip =
    (await headers()).get("cf-connecting-ip") ??
    (await headers()).get("x-forwarded-for") ??
    "unknown";
  try {
    const rl = await env.PUBLIC_RATE_LIMITER.limit({ key: ip });
    if (!rl.success) return <Unavailable />;
  } catch {
    /* limiter not bound in some local setups; fail open */
  }

  const db = getDb();
  const proj = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.tokenPublico, token))
    .get();

  if (!proj || !proj.activo) return <Unavailable />;

  const [eventos, mensajes] = await Promise.all([
    db
      .select()
      .from(eventosProgreso)
      .where(eq(eventosProgreso.proyectoId, proj.id))
      .orderBy(asc(eventosProgreso.creadoEn))
      .all(),
    db
      .select()
      .from(mensajesChat)
      .where(eq(mensajesChat.proyectoId, proj.id))
      .orderBy(asc(mensajesChat.creadoEn))
      .all(),
  ]);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold">
          <span className="h-5 w-5 rounded-md bg-brand-gradient" />
          <span>
            <span className="text-gradient">Sacor</span>
            <span className="text-white">Tech</span>
          </span>
        </div>
        <h1 className="text-2xl font-black text-white sm:text-3xl">
          {proj.nombre}
        </h1>

        {/* Etapa actual — destacada */}
        {proj.etapaActual && (
          <div className="mt-5 overflow-hidden rounded-2xl bg-brand-gradient p-[1px] shadow-neon">
            <div className="rounded-2xl bg-ink-900 p-5">
              <p className="text-sm text-brand-300">Etapa actual</p>
              <p className="mt-0.5 text-2xl font-black text-white">
                {proj.etapaActual}
              </p>
            </div>
          </div>
        )}

        {/* Progreso */}
        <div className="card mt-4 p-5">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-sm text-slate-400">Progreso general</span>
            <span className="text-2xl font-black text-white">
              {proj.progresoPct}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-brand-gradient transition-all"
              style={{ width: `${proj.progresoPct}%` }}
            />
          </div>
        </div>

        {/* Roadmap / línea de tiempo */}
        <section className="card mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-200">
            Avances del proyecto
          </h2>
          {eventos.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Pronto verás aquí los avances de tu proyecto.
            </p>
          ) : (
            <ol className="mt-4 space-y-4">
              {eventos.map((ev, i) => (
                <li key={ev.id} className="relative flex gap-3 pl-1">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-brand-500 shadow-neon" />
                    {i < eventos.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-white/10" />
                    )}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm text-slate-200">{ev.descripcion}</p>
                    <time className="text-xs text-slate-500">
                      {new Date(ev.creadoEn).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Chat con el equipo */}
        <div className="mt-4">
          <PublicChat
            token={token}
            historial={mensajes.map((m) => ({
              id: m.id,
              autorTipo: m.autorTipo as "cliente" | "socio",
              autorNombre: m.autorNombre,
              texto: m.texto,
              creadoEn: m.creadoEn,
            }))}
          />
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Powered by SacorTech · sacortech.xyz
        </p>
      </div>
    </main>
  );
}
