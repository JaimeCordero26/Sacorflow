import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bugs, proyectos } from "@/db/schema";
import { BugsView } from "./bugs-view";

export const dynamic = "force-dynamic";

export default async function BugsPage() {
  const db = getDb();

  const [lista, proys] = await Promise.all([
    db
      .select({
        id: bugs.id,
        titulo: bugs.titulo,
        descripcion: bugs.descripcion,
        prioridad: bugs.prioridad,
        estado: bugs.estado,
        proyectoId: bugs.proyectoId,
        proyectoNombre: proyectos.nombre,
        creadoEn: bugs.creadoEn,
        resueltoEn: bugs.resueltoEn,
      })
      .from(bugs)
      .leftJoin(proyectos, eq(proyectos.id, bugs.proyectoId))
      .orderBy(desc(bugs.creadoEn))
      .all(),
    db
      .select({ id: proyectos.id, nombre: proyectos.nombre })
      .from(proyectos)
      .orderBy(asc(proyectos.nombre))
      .all(),
  ]);

  return (
    <BugsView
      bugs={lista.map((b) => ({
        id: b.id,
        titulo: b.titulo,
        descripcion: b.descripcion,
        prioridad: b.prioridad as "alta" | "media" | "baja",
        estado: b.estado as "abierto" | "en_progreso" | "resuelto",
        proyectoId: b.proyectoId,
        proyectoNombre: b.proyectoNombre,
        creadoEn: b.creadoEn,
        resueltoEn: b.resueltoEn,
      }))}
      proyectos={proys}
    />
  );
}
