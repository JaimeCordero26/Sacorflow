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
import { cargarIssuesDisponibles, importarIssueComoTarea, moverTarea } from "../sprint-actions";
import { GithubIssuesPool } from "./github-issues-pool";
import { IssueDetailModal } from "./issue-detail-modal";
import { SprintHeader } from "./sprint-header";
import { SprintTabs } from "./sprint-tabs";
import { TareaCardFace } from "./tarea-card";
import { TareaColumn } from "./tarea-column";
import { TareaModal } from "./tarea-modal";
import {
  COLUMNAS_TAREA,
  GH_DRAG_PREFIX,
  type ColumnaTarea,
  type GithubIssueLite,
  type SprintInfo,
  type TareaCard,
} from "./types";

export function SprintBoard({
  proyectoId,
  tieneRepo,
  sprints,
  tareas: tareasProp,
}: {
  proyectoId: string;
  tieneRepo: boolean;
  sprints: SprintInfo[];
  tareas: TareaCard[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tareas, setTareas] = useState(tareasProp);
  useEffect(() => setTareas(tareasProp), [tareasProp]);

  const activo = sprints.find((s) => s.estado === "activo") ?? null;
  const [sprintSeleccionado, setSprintSeleccionado] = useState<string | null>(
    activo?.id ?? null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTarea, setOpenTarea] = useState<TareaCard | null>(null);
  const [verIssueTarea, setVerIssueTarea] = useState<TareaCard | null>(null);
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const [issues, setIssues] = useState<GithubIssueLite[] | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  function recargarIssues() {
    setIssuesError(null);
    setIssuesLoading(true);
    startTransition(async () => {
      const res = await cargarIssuesDisponibles(proyectoId);
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
    const overCol = e.over?.id as ColumnaTarea | undefined;
    if (!overCol) return;
    const id = String(e.active.id);

    if (id.startsWith(GH_DRAG_PREFIX)) {
      const issue = e.active.data.current?.issue as GithubIssueLite | undefined;
      if (!issue) return;
      setIssues((prev) => prev?.filter((i) => i.number !== issue.number) ?? prev);
      await importarIssueComoTarea(proyectoId, sprintSeleccionado, overCol, {
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
      });
      router.refresh();
      return;
    }

    const tarea = tareas.find((t) => t.id === id);
    if (!tarea || (tarea.columna === overCol && tarea.sprintId === sprintSeleccionado)) return;
    const orden = tareas.filter(
      (t) => t.sprintId === sprintSeleccionado && t.columna === overCol,
    ).length;
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, columna: overCol, orden } : t)));
    await moverTarea(id, proyectoId, overCol, orden);
  }

  const active = tareas.find((t) => t.id === activeId) ?? null;
  const activeIssue = activeId?.startsWith(GH_DRAG_PREFIX)
    ? (issues?.find((i) => `${GH_DRAG_PREFIX}${i.number}` === activeId) ?? null)
    : null;
  const tareasSprint = tareas.filter((t) => t.sprintId === sprintSeleccionado);
  const sprintActual = sprints.find((s) => s.id === sprintSeleccionado) ?? null;

  return (
    <section className="card p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-300">Tablero de trabajo</h2>
      <p className="mb-4 text-xs text-slate-500">
        Sprints, backlog y tareas — arrastra issues de GitHub directo al tablero.
      </p>

      <SprintTabs
        proyectoId={proyectoId}
        sprints={sprints}
        seleccionado={sprintSeleccionado}
        onSelect={setSprintSeleccionado}
      />

      {sprintActual && (
        <SprintHeader
          sprint={sprintActual}
          proyectoId={proyectoId}
          onDeleted={() => setSprintSeleccionado(null)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div
            className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${
              tieneRepo ? "lg:col-span-4" : "lg:col-span-5"
            }`}
          >
            {COLUMNAS_TAREA.map((col) => (
              <TareaColumn
                key={col.key}
                col={col}
                tareas={tareasSprint.filter((t) => t.columna === col.key)}
                proyectoId={proyectoId}
                sprintId={sprintSeleccionado}
                onOpen={setOpenTarea}
                onVerIssue={setVerIssueTarea}
              />
            ))}
          </div>
          {montado &&
            createPortal(
              // Portal a document.body: el <section className="card"> de arriba usa
              // backdrop-blur-sm, que vuelve a ese ancestro el containing block de
              // "position: fixed" y desplaza el DragOverlay respecto al cursor real.
              <DragOverlay>
                {active ? <TareaCardFace tarea={active} dragging /> : null}
                {activeIssue ? (
                  <div className="rotate-2 rounded-lg border border-brand-500/40 bg-ink-850 p-2.5 shadow-neon">
                    <p className="text-sm text-white">{activeIssue.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">#{activeIssue.number}</p>
                  </div>
                ) : null}
              </DragOverlay>,
              document.body,
            )}

          {tieneRepo && (
            <div className="lg:col-span-1">
              <GithubIssuesPool
                proyectoId={proyectoId}
                issues={issues}
                loading={issuesLoading}
                error={issuesError}
                onReload={recargarIssues}
              />
            </div>
          )}
        </DndContext>
      </div>

      {openTarea && (
        <TareaModal
          tarea={tareas.find((t) => t.id === openTarea.id) ?? openTarea}
          proyectoId={proyectoId}
          sprints={sprints}
          onClose={() => setOpenTarea(null)}
          onDeleted={() => setOpenTarea(null)}
        />
      )}

      {verIssueTarea?.githubIssueNumber && (
        <IssueDetailModal
          proyectoId={proyectoId}
          issueNumber={verIssueTarea.githubIssueNumber}
          title={verIssueTarea.titulo}
          fallbackUrl={verIssueTarea.githubIssueUrl}
          onClose={() => setVerIssueTarea(null)}
        />
      )}
    </section>
  );
}
