import { getDb } from "@/db";
import {
  getProjectDetailByPublicToken,
  listProjectChatMessages,
  listProjectEvents,
} from "@/server/models/project.model";
import type { ProgressEvent, ProjectDetail } from "@/entities/project/model/types";

export interface PublicProjectView {
  project: ProjectDetail;
  events: ProgressEvent[];
  messages: Awaited<ReturnType<typeof listProjectChatMessages>>;
}

// Solo expone proyectos activos: mismo resultado (null) exista o no el token,
// para no filtrar cuál de los dos casos ocurrió.
export async function getPublicProjectView(token: string): Promise<PublicProjectView | null> {
  const db = getDb();
  const project = await getProjectDetailByPublicToken(db, token);
  if (!project || !project.active) return null;

  const [eventsDesc, messages] = await Promise.all([
    listProjectEvents(db, project.id),
    listProjectChatMessages(db, project.id),
  ]);

  // El timeline público se muestra en orden cronológico (más viejo primero),
  // al revés del historial de eventos del panel admin.
  const events = eventsDesc.slice().reverse();

  return { project, events, messages };
}
