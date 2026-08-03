import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import {
  githubCuentas,
  ideasComentarios,
  proyectos,
  usuarios,
} from "@/db/schema";
import { KanbanBoard, type KanbanCard } from "./kanban-board";

export const dynamic = "force-dynamic";

// Colores neón estables por socio (para distinguir quién dijo qué).
const AUTOR_COLORS = ["#00f5ff", "#7c3aed", "#ec4899", "#22d3ee"];

export default async function KanbanPage() {
  const db = getDb();

  const [projs, comentarios, autores, cuentas] = await Promise.all([
    db.select().from(proyectos).orderBy(asc(proyectos.orden)).all(),
    db.select().from(ideasComentarios).orderBy(asc(ideasComentarios.creadoEn)).all(),
    db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios).all(),
    db
      .select({
        usuarioId: githubCuentas.usuarioId,
        login: githubCuentas.githubLogin,
        avatar: githubCuentas.avatarUrl,
      })
      .from(githubCuentas)
      .all(),
  ]);

  const idOrden = new Map(autores.map((a, i) => [a.id, i]));
  const avatarPorId = new Map(cuentas.map((c) => [c.usuarioId, c.avatar]));
  const autor = (id: string | null) => {
    if (!id) return { nombre: "—", color: "#64748b", avatar: null };
    const nombre = autores.find((a) => a.id === id)?.nombre ?? "—";
    const color = AUTOR_COLORS[(idOrden.get(id) ?? 0) % AUTOR_COLORS.length];
    return { nombre, color, avatar: avatarPorId.get(id) ?? null };
  };

  const cards: KanbanCard[] = projs.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    columna: p.columnaKanban as KanbanCard["columna"],
    orden: p.orden,
    autor: autor(p.creadoPor),
    tieneRepo: !!p.repoGithub,
    creadoEn: p.creadoEn,
    comentarios: comentarios
      .filter((c) => c.proyectoId === p.id)
      .map((c) => ({
        id: c.id,
        texto: c.texto,
        autor: autor(c.autorId),
        creadoEn: c.creadoEn,
      })),
  }));

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
