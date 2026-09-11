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
  sprints,
  tareas,
} from "@/db/schema";

// Todo lo que necesita la vista de detalle de un proyecto
// (`/admin/proyectos/[id]`): el proyecto mismo + las colecciones
// relacionadas, en un solo Promise.all. Devuelve null si el proyecto no
// existe. Es un fetch puro — no escribe nada (ver `marcarMensajesClienteLeidos`
// para el side-effect que la página dispara por separado).
export async function getProyectoDetalle(proyectoId: string) {
  const db = getDb();

  const proyecto = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proyecto) return null;

  const [
    listaEtapas,
    eventos,
    mensajes,
    todosClientes,
    clientesVinculados,
    propuestas,
    creadorGh,
    listaSprints,
    listaTareas,
  ] = await Promise.all([
    db.select().from(etapas).orderBy(asc(etapas.orden)).all(),
    db
      .select()
      .from(eventosProgreso)
      .where(eq(eventosProgreso.proyectoId, proyectoId))
      .orderBy(desc(eventosProgreso.creadoEn))
      .all(),
    db
      .select()
      .from(mensajesChat)
      .where(eq(mensajesChat.proyectoId, proyectoId))
      .orderBy(asc(mensajesChat.creadoEn))
      .all(),
    db.select().from(clientes).orderBy(asc(clientes.nombre)).all(),
    db
      .select({ id: clientes.id, nombre: clientes.nombre })
      .from(proyectoClientes)
      .innerJoin(clientes, eq(clientes.id, proyectoClientes.clienteId))
      .where(eq(proyectoClientes.proyectoId, proyectoId))
      .all(),
    db
      .select()
      .from(issuesPropuestos)
      .where(eq(issuesPropuestos.proyectoId, proyectoId))
      .orderBy(asc(issuesPropuestos.creadoEn))
      .all(),
    proyecto.creadoPor
      ? db
          .select({ login: githubCuentas.githubLogin })
          .from(githubCuentas)
          .where(eq(githubCuentas.usuarioId, proyecto.creadoPor))
          .get()
      : Promise.resolve(undefined),
    db
      .select()
      .from(sprints)
      .where(eq(sprints.proyectoId, proyectoId))
      .orderBy(asc(sprints.orden))
      .all(),
    db.select().from(tareas).where(eq(tareas.proyectoId, proyectoId)).all(),
  ]);

  return {
    proyecto,
    etapas: listaEtapas,
    eventos,
    mensajes,
    todosClientes,
    clientesVinculados,
    propuestas,
    creadorGithubLogin: creadorGh?.login ?? null,
    sprints: listaSprints,
    tareas: listaTareas,
  };
}

// Side-effect explícito (no es parte del fetch de arriba): marca como leídos
// los mensajes que el cliente mandó en este proyecto, para que dejen de
// aparecer en el inbox de socios. La página lo llama aparte, a propósito.
export async function marcarMensajesClienteLeidos(proyectoId: string) {
  const db = getDb();
  await db
    .update(mensajesChat)
    .set({ leido: true })
    .where(
      and(
        eq(mensajesChat.proyectoId, proyectoId),
        eq(mensajesChat.autorTipo, "cliente"),
      ),
    );
}
