"use client";

import { useDroppable } from "@dnd-kit/core";
import { CreateTaskForm } from "@/features/create-task/ui/CreateTaskForm";
import { DraggableTask } from "./DraggableTask";
import type { Task, TaskColumn } from "@/entities/task/model/types";

export function TaskColumnView({
  column,
  tasks,
  projectId,
  sprintId,
  hasRepo,
  onOpen,
  onViewIssue,
}: {
  column: { key: TaskColumn; label: string; dot: string };
  tasks: Task[];
  projectId: string;
  sprintId: string | null;
  hasRepo: boolean;
  onOpen: (t: Task) => void;
  onViewIssue: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border p-3 transition ${
        isOver ? "border-brand-500/50 bg-brand-500/5" : "border-white/10 bg-ink-900/40"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className={`h-2 w-2 rounded-full ${column.dot}`} />
          {column.label}
        </h4>
        <span className="rounded-full bg-white/5 px-2 text-xs text-slate-400">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {column.key === "por_hacer" && (
          <CreateTaskForm projectId={projectId} sprintId={sprintId} hasRepo={hasRepo} />
        )}
        {tasks.map((t) => (
          <DraggableTask key={t.id} task={t} onOpen={onOpen} onViewIssue={onViewIssue} />
        ))}
        {tasks.length === 0 && column.key !== "por_hacer" && (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-600">
            Vacío
          </p>
        )}
      </div>
    </div>
  );
}
