"use client";

import { useDraggable } from "@dnd-kit/core";
import { TaskCardFace } from "@/entities/task/ui/TaskCardFace";
import type { Task } from "@/entities/task/model/types";

export function DraggableTask({
  task,
  onOpen,
  onViewIssue,
}: {
  task: Task;
  onOpen: (t: Task) => void;
  onViewIssue: (t: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      className={`cursor-grab ${isDragging ? "opacity-40" : ""}`}
    >
      <TaskCardFace task={task} onViewIssue={onViewIssue} />
    </div>
  );
}
