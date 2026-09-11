"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  importIssueAsTaskAction,
  listAvailableGithubIssuesAction,
  moveTaskAction,
} from "@/app/admin/proyectos/[id]/sprint-actions";
import { GithubIssuesPool } from "@/features/browse-github-issues/ui/GithubIssuesPool";
import { IssueDetailModal } from "@/features/browse-github-issues/ui/IssueDetailModal";
import { SprintHeader } from "@/features/manage-sprint/ui/SprintHeader";
import { SprintTabs } from "@/features/manage-sprint/ui/SprintTabs";
import { TaskModal } from "@/features/manage-task/ui/TaskModal";
import { TaskCardFace } from "@/entities/task/ui/TaskCardFace";
import { GH_DRAG_PREFIX, TASK_COLUMNS } from "@/entities/task/model/types";
import { TaskColumnView } from "./TaskColumnView";
import type { Sprint } from "@/entities/sprint/model/types";
import type { Task, TaskColumn } from "@/entities/task/model/types";
import type { GithubIssueLite } from "@/lib/github-oauth";

export function SprintBoard({
  proyectoId: projectId,
  tieneRepo: hasRepo,
  sprints,
  tareas: tasksProp,
}: {
  proyectoId: string;
  tieneRepo: boolean;
  sprints: Sprint[];
  tareas: Task[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tasks, setTasks] = useState(tasksProp);
  useEffect(() => setTasks(tasksProp), [tasksProp]);

  const activeSprint = sprints.find((s) => s.status === "activo") ?? null;
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(
    activeSprint?.id ?? null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [viewIssueTask, setViewIssueTask] = useState<Task | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [issues, setIssues] = useState<GithubIssueLite[] | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  function reloadIssues() {
    setIssuesError(null);
    setIssuesLoading(true);
    startTransition(async () => {
      const res = await listAvailableGithubIssuesAction(projectId);
      setIssuesLoading(false);
      if (res.ok) setIssues(res.issues ?? []);
      else setIssuesError(res.error ?? "Error al cargar issues");
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overColumn = e.over?.id as TaskColumn | undefined;
    if (!overColumn) return;
    const id = String(e.active.id);

    if (id.startsWith(GH_DRAG_PREFIX)) {
      const issue = e.active.data.current?.issue as GithubIssueLite | undefined;
      if (!issue) return;
      setIssues((prev) => prev?.filter((i) => i.number !== issue.number) ?? prev);
      await importIssueAsTaskAction(projectId, selectedSprintId, overColumn, {
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
      });
      router.refresh();
      return;
    }

    const task = tasks.find((t) => t.id === id);
    if (!task || (task.column === overColumn && task.sprintId === selectedSprintId)) return;
    const order = tasks.filter(
      (t) => t.sprintId === selectedSprintId && t.column === overColumn,
    ).length;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, column: overColumn, order } : t)));
    await moveTaskAction(id, projectId, overColumn, order);
  }

  const active = tasks.find((t) => t.id === activeId) ?? null;
  const activeIssue = activeId?.startsWith(GH_DRAG_PREFIX)
    ? (issues?.find((i) => `${GH_DRAG_PREFIX}${i.number}` === activeId) ?? null)
    : null;
  const sprintTasks = tasks.filter((t) => t.sprintId === selectedSprintId);
  const currentSprint = sprints.find((s) => s.id === selectedSprintId) ?? null;

  return (
    <section className="card p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-300">Tablero de trabajo</h2>
      <p className="mb-4 text-xs text-slate-500">
        Sprints, backlog y tareas — arrastra issues de GitHub directo al tablero.
      </p>

      <SprintTabs
        projectId={projectId}
        sprints={sprints}
        selected={selectedSprintId}
        onSelect={setSelectedSprintId}
      />

      {currentSprint && (
        <SprintHeader
          sprint={currentSprint}
          projectId={projectId}
          onDeleted={() => setSelectedSprintId(null)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div
            className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${
              hasRepo ? "lg:col-span-4" : "lg:col-span-5"
            }`}
          >
            {TASK_COLUMNS.map((col) => (
              <TaskColumnView
                key={col.key}
                column={col}
                tasks={sprintTasks.filter((t) => t.column === col.key)}
                projectId={projectId}
                sprintId={selectedSprintId}
                hasRepo={hasRepo}
                onOpen={setOpenTask}
                onViewIssue={setViewIssueTask}
              />
            ))}
          </div>
          {mounted &&
            createPortal(
              // Portal a document.body: el <section className="card"> de arriba usa
              // backdrop-blur-sm, que vuelve a ese ancestro el containing block de
              // "position: fixed" y desplaza el DragOverlay respecto al cursor real.
              <DragOverlay>
                {active ? <TaskCardFace task={active} dragging /> : null}
                {activeIssue ? (
                  <div className="rotate-2 rounded-lg border border-brand-500/40 bg-ink-850 p-2.5 shadow-neon">
                    <p className="text-sm text-white">{activeIssue.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">#{activeIssue.number}</p>
                  </div>
                ) : null}
              </DragOverlay>,
              document.body,
            )}

          {hasRepo && (
            <div className="lg:col-span-1">
              <GithubIssuesPool
                projectId={projectId}
                issues={issues}
                loading={issuesLoading}
                error={issuesError}
                onReload={reloadIssues}
              />
            </div>
          )}
        </DndContext>
      </div>

      {openTask && (
        <TaskModal
          task={tasks.find((t) => t.id === openTask.id) ?? openTask}
          projectId={projectId}
          sprints={sprints}
          onClose={() => setOpenTask(null)}
          onDeleted={() => setOpenTask(null)}
        />
      )}

      {viewIssueTask?.githubIssueNumber && (
        <IssueDetailModal
          projectId={projectId}
          issueNumber={viewIssueTask.githubIssueNumber}
          title={viewIssueTask.title}
          fallbackUrl={viewIssueTask.githubIssueUrl}
          onClose={() => setViewIssueTask(null)}
        />
      )}
    </section>
  );
}
