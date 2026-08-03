import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  clientes,
  etapas,
  eventosProgreso,
  githubCuentas,
  issuesPropuestos,
  mensajesChat,
  proyectoClientes,
  proyectos,
} from "@/db/schema";
import { StageEditor } from "./stage-editor";
import { ActiveToggle } from "./active-toggle";
import { PublicLink } from "./public-link";
import { GithubPanel } from "./github-panel";
import { PropuestasPanel } from "./propuestas-panel";
import { ClientLinker } from "./client-linker";
import { AdminChat } from "./admin-chat";

export const dynamic = "force-dynamic";

export default async function ProyectoDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const proj = await db.select().from(proyectos).where(eq(proyectos.id, id)).get();
  if (!proj) notFound();

  const [
    listaEtapas,
    eventos,
    mensajes,
    todosClientes,
    vinculados,
    propuestas,
    creadorGh,
  ] = await Promise.all([
    db.select().from(etapas).orderBy(asc(etapas.orden)).all(),
    db
      .select()
      .from(eventosProgreso)
      .where(eq(eventosProgreso.proyectoId, id))
      .orderBy(desc(eventosProgreso.creadoEn))
      .all(),
    db
      .select()
      .from(mensajesChat)
      .where(eq(mensajesChat.proyectoId, id))
      .orderBy(asc(mensajesChat.creadoEn))
      .all(),
    db.select().from(clientes).orderBy(asc(clientes.nombre)).all(),
    db
      .select({ id: clientes.id, nombre: clientes.nombre })
      .from(proyectoClientes)
      .innerJoin(clientes, eq(clientes.id, proyectoClientes.clienteId))
      .where(eq(proyectoClientes.proyectoId, id))
      .all(),
    db
      .select()
      .from(issuesPropuestos)
      .where(eq(issuesPropuestos.proyectoId, id))
      .orderBy(asc(issuesPropuestos.creadoEn))
      .all(),
    proj.creadoPor
      ? db
          .select({ login: githubCuentas.githubLogin })
          .from(githubCuentas)
          .where(eq(githubCuentas.usuarioId, proj.creadoPor))
          .get()
      : Promise.resolve(undefined),
  ]);

  await db
    .update(mensajesChat)
    .set({ leido: true })
    .where(
      and(
        eq(mensajesChat.proyectoId, id),
        eq(mensajesChat.autorTipo, "cliente"),
      ),
    );

  const stageNames = listaEtapas.map((e) => e.nombre);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">{proj.nombre}</h1>
          {proj.descripcion && (
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              {proj.descripcion}
            </p>
          )}
          {proj.repoGithub && (
            <a
              href={`https://github.com/${proj.repoGithub}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:underline"
            >
              {proj.repoGithub} ↗
            </a>
          )}
        </div>
        <ActiveToggle proyectoId={proj.id} activo={proj.activo} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300">Progreso</h2>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-400">Avance</span>
                <span className="font-bold text-white">{proj.progresoPct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-brand-gradient-2 transition-all"
                  style={{ width: `${proj.progresoPct}%` }}
                />
              </div>
            </div>
            <div className="mt-4">
              <StageEditor
                proyectoId={proj.id}
                etapaActual={proj.etapaActual}
                etapas={stageNames}
              />
            </div>
          </section>

          <GithubPanel
            proyectoId={proj.id}
            repoGithub={proj.repoGithub}
            installationId={proj.installationId}
            milestoneId={proj.milestoneId}
            milestoneTitulo={proj.milestoneTitulo}
            creadorLogin={creadorGh?.login ?? null}
          />

          <PropuestasPanel
            proyectoId={proj.id}
            tieneRepo={!!proj.repoGithub}
            propuestas={propuestas.map((p) => ({
              id: p.id,
              titulo: p.titulo,
              cuerpo: p.cuerpo,
              estado: p.estado as "propuesto" | "aceptado" | "descartado",
              githubIssueNumber: p.githubIssueNumber,
              githubIssueUrl: p.githubIssueUrl,
            }))}
          />

          <PublicLink token={proj.tokenPublico} activo={proj.activo} />

          <ClientLinker
            proyectoId={proj.id}
            todos={todosClientes.map((c) => ({ id: c.id, nombre: c.nombre }))}
            vinculados={vinculados}
          />

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300">
              Historial de eventos
            </h2>
            <ol className="mt-3 space-y-3">
              {eventos.length === 0 && (
                <li className="text-sm text-slate-500">Sin eventos todavía.</li>
              )}
              {eventos.map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <div>
                    <p className="text-sm text-slate-200">{ev.descripcion}</p>
                    <time className="text-xs text-slate-600">
                      {new Date(ev.creadoEn).toLocaleString("es-MX")}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="lg:col-span-1">
          <AdminChat
            proyectoId={proj.id}
            historial={mensajes.map((m) => ({
              id: m.id,
              autorTipo: m.autorTipo as "cliente" | "socio",
              autorNombre: m.autorNombre,
              texto: m.texto,
              creadoEn: m.creadoEn,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
