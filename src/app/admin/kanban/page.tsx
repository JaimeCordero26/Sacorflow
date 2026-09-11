import { getKanbanBoardData } from "@/server/services/project.service";
import { KanbanBoard } from "@/widgets/kanban-board/ui/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const cards = await getKanbanBoardData();

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="heading text-2xl">Tablero</h1>
          <p className="mt-1 text-sm text-slate-400">
            Ideas y proyectos · arrastra las tarjetas entre columnas
          </p>
        </div>
      </div>
      <KanbanBoard cards={cards} />
    </div>
  );
}
