import { notFound } from "next/navigation";
import { getClientsPageData } from "@/server/services/client.service";
import { listClientsLinkedToProject } from "@/server/models/client.model";
import { getDb } from "@/db";
import {
  getProjectChatHistory,
  getProjectDetail,
  getProjectEvents,
  markClientMessagesAsRead,
} from "@/server/services/project.service";
import { getStages } from "@/server/services/stage.service";
import { getProposedIssues } from "@/server/services/proposed-issue.service";
import { getSprintBoardData } from "@/server/services/sprint.service";
import { StageEditor } from "@/features/edit-project-stage/ui/StageEditor";
import { StagesManager } from "@/features/manage-stages/ui/StagesManager";
import { ActiveToggle } from "@/features/toggle-project-active/ui/ActiveToggle";
import { PublicLinkPanel } from "@/features/share-project-link/ui/PublicLinkPanel";
import { GithubPanel } from "@/features/manage-project-github-link/ui/GithubPanel";
import { ProposedIssuesPanel } from "@/features/manage-proposed-issues/ui/ProposedIssuesPanel";
import { ClientLinker } from "@/features/link-client-to-project/ui/ClientLinker";
import { AdminChat } from "./admin-chat";
import { SprintBoard } from "@/widgets/sprint-board/ui/SprintBoard";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await getProjectDetail(id);
  if (!project) notFound();

  const [stages, events, allClients, linkedClients, proposals, sprintBoardData, messages] =
    await Promise.all([
      getStages(),
      getProjectEvents(id),
      getClientsPageData(),
      listClientsLinkedToProject(getDb(), id),
      getProposedIssues(id),
      getSprintBoardData(id),
      getProjectChatHistory(id),
    ]);

  // Side-effect explícito, separado del fetch de arriba: marca como leídos
  // los mensajes que el cliente mandó (para el inbox de socios en /admin).
  await markClientMessagesAsRead(id);

  const stageNames = stages.map((s) => s.name);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">{project.name}</h1>
          {project.description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              {project.description}
            </p>
          )}
          {project.repoGithub && (
            <a
              href={`https://github.com/${project.repoGithub}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:underline"
            >
              {project.repoGithub} ↗
            </a>
          )}
        </div>
        <ActiveToggle projectId={project.id} active={project.active} />
      </div>

      <SprintBoard
        proyectoId={project.id}
        tieneRepo={!!project.repoGithub}
        sprints={sprintBoardData.sprints}
        tareas={sprintBoardData.tasks}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300">Progreso</h2>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-400">Avance</span>
                <span className="font-bold text-white">{project.progressPct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-brand-gradient-2 transition-all"
                  style={{ width: `${project.progressPct}%` }}
                />
              </div>
            </div>
            <div className="mt-4">
              <StageEditor
                projectId={project.id}
                currentStage={project.stage}
                stages={stageNames}
              />
              <StagesManager stages={stages} />
            </div>
          </section>

          <GithubPanel
            projectId={project.id}
            repoGithub={project.repoGithub}
            installationId={project.installationId}
            milestoneId={project.milestoneId}
            milestoneTitle={project.milestoneTitle}
            creatorLogin={project.creatorGithubLogin}
          />

          <ProposedIssuesPanel
            projectId={project.id}
            hasRepo={!!project.repoGithub}
            proposals={proposals}
          />

          <PublicLinkPanel token={project.publicToken} active={project.active} />

          <ClientLinker
            projectId={project.id}
            allClients={allClients.map((c) => ({ id: c.id, name: c.name }))}
            linkedClients={linkedClients}
          />

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-300">
              Historial de eventos
            </h2>
            <ol className="mt-3 space-y-3">
              {events.length === 0 && (
                <li className="text-sm text-slate-500">Sin eventos todavía.</li>
              )}
              {events.map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <div>
                    <p className="text-sm text-slate-200">{ev.description}</p>
                    <time className="text-xs text-slate-600">
                      {new Date(ev.createdAt).toLocaleString("es-MX")}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="lg:col-span-1">
          <AdminChat proyectoId={project.id} history={messages} />
        </div>
      </div>
    </div>
  );
}
