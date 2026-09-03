"use client";

import { useEffect, useState, useTransition } from "react";
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
              />
            ))}
          </div>
          <DragOverlay>
            {active ? <TareaCardFace tarea={active} dragging /> : null}
          </DragOverlay>

          {tieneRepo && (
            <div className="lg:col-span-1">
              <GithubIssuesPool
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
    </section>
  );
}
