"use server";

import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bugs,
  clientes,
  etapas,
  eventosProgreso,
  githubCuentas,
  ideasComentarios,
  issuesPropuestos,
  mensajesChat,
  proyectoClientes,
  proyectos,
  usuarios,
  type ColumnaKanban,
} from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { newId, newPublicToken } from "@/lib/ids";
import { computeProgress } from "@/lib/github";
import {
  createIssue,
  createRepo,
  createWebhook,
  getRepo,
  getUserToken,
  progressWithToken,
} from "@/lib/github-user";
import { desglosarIdea } from "@/lib/ai";

// slug para nombre de repo: minúsculas, alfanumérico + guiones.
function slugRepo(nombre: string): string {
  const s = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return s || `proyecto-${Date.now()}`;
}

const COLUMNS: ColumnaKanban[] = ["idea", "en_progreso", "listo", "pausado", "cancelado", "cerrado", "entregado"];

// ---------- Kanban / proyectos ----------

export async function crearProyecto(formData: FormData) {
  const session = await requireSession();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!nombre) return;

  const db = getDb();
  await db.insert(proyectos).values({
    id: newId(),
    nombre,
    descripcion: descripcion || null,
    columnaKanban: "idea",
    tokenPublico: newPublicToken(),
    creadoPor: session.uid,
  });
  revalidatePath("/admin/kanban");
}

export async function eliminarProyecto(proyectoId: string) {
  await requireSession();
  const db = getDb();
  // Los hijos (comentarios, issues, eventos, mensajes, pivote cliente) tienen
  // onDelete: "cascade" en el schema, así que se borran solos.
  await db.delete(proyectos).where(eq(proyectos.id, proyectoId));
  revalidatePath("/admin/kanban");
  revalidatePath("/admin");
}

export async function moverTarjeta(
  proyectoId: string,
  columna: ColumnaKanban,
  orden: number,
) {
  await requireSession();
  if (!COLUMNS.includes(columna)) return;
  const db = getDb();
  await db
    .update(proyectos)
    .set({ columnaKanban: columna, orden })
    .where(eq(proyectos.id, proyectoId));
  revalidatePath("/admin/kanban");
}

export async function agregarComentario(proyectoId: string, texto: string) {
  const session = await requireSession();
  const t = texto.trim();
  if (!t) return;
  const db = getDb();
  await db.insert(ideasComentarios).values({
    id: newId(),
    proyectoId,
    autorId: session.uid,
    texto: t,
  });
  revalidatePath(`/admin/proyectos/${proyectoId}`);
  revalidatePath("/admin/kanban");
}

export async function vincularGithub(
  proyectoId: string,
  data: {
    repoGithub: string;
    installationId: number;
    milestoneId?: number | null;
    milestoneTitulo?: string | null;
  },
) {
  await requireSession();
  const db = getDb();
  // Only projects that are "en_progreso" may be linked to GitHub.
  const proj = await db
    .select({ columna: proyectos.columnaKanban })
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj || proj.columna !== "en_progreso") return;

  await db
    .update(proyectos)
    .set({
      repoGithub: data.repoGithub.trim(),
      installationId: data.installationId,
      milestoneId: data.milestoneId ?? null,
      milestoneTitulo: data.milestoneTitulo ?? null,
    })
    .where(eq(proyectos.id, proyectoId));

  await refrescarProgreso(proyectoId);
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function refrescarProgreso(proyectoId: string) {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();
  const proj = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj?.repoGithub) return;

  try {
    let result: { pct: number; closed: number; total: number } | null = null;

    // Preferir el user token del creador (repos creados por la app).
    const creadorToken = proj.creadoPor
      ? await getUserToken(env, proj.creadoPor)
      : null;
    if (creadorToken) {
      result = await progressWithToken(creadorToken, proj.repoGithub);
    } else if (proj.installationId) {
      // Fallback: GitHub App (repos vinculados a mano).
      result = await computeProgress(env, {
        installationId: proj.installationId,
        repo: proj.repoGithub,
        milestoneId: proj.milestoneId,
      });
    }
    if (!result) return;

    await db
      .update(proyectos)
      .set({ progresoPct: result.pct })
      .where(eq(proyectos.id, proyectoId));
    await db.insert(eventosProgreso).values({
      id: newId(),
      proyectoId,
      tipo: "progreso",
      descripcion: `Progreso actualizado: ${result.closed} de ${result.total} tareas completadas (${result.pct}%).`,
      progresoPct: result.pct,
    });
  } catch (e) {
    console.error("[refrescarProgreso]", e);
  }
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function actualizarEtapa(proyectoId: string, etapa: string) {
  await requireSession();
  const db = getDb();
  await db
    .update(proyectos)
    .set({ etapaActual: etapa })
    .where(eq(proyectos.id, proyectoId));
  await db.insert(eventosProgreso).values({
    id: newId(),
    proyectoId,
    tipo: "etapa",
    descripcion: `El proyecto avanzó a la etapa: ${etapa}.`,
  });
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function cambiarActivo(proyectoId: string, activo: boolean) {
  await requireSession();
  const db = getDb();
  await db
    .update(proyectos)
    .set({ activo })
    .where(eq(proyectos.id, proyectoId));
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function marcarLeido(proyectoId: string) {
  await requireSession();
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
  revalidatePath("/admin");
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

// ---------- Etapas configurables ----------

export async function crearEtapa(nombre: string, orden: number) {
  await requireSession();
  const n = nombre.trim();
  if (!n) return;
  const db = getDb();
  await db.insert(etapas).values({ id: newId(), nombre: n, orden });
  revalidatePath("/admin/proyectos", "layout");
}

export async function eliminarEtapa(id: string) {
  await requireSession();
  const db = getDb();
  await db.delete(etapas).where(eq(etapas.id, id));
  revalidatePath("/admin/proyectos", "layout");
}

// ---------- Bug tracker (errores) ----------

const PRIORIDADES = ["alta", "media", "baja"] as const;
const ESTADOS_BUG = ["abierto", "en_progreso", "resuelto"] as const;

export async function crearBug(formData: FormData) {
  const session = await requireSession();
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;
  const prioridad = String(formData.get("prioridad") ?? "media");
  const proyectoId = String(formData.get("proyectoId") ?? "").trim();
  const db = getDb();
  await db.insert(bugs).values({
    id: newId(),
    titulo,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    prioridad: (PRIORIDADES as readonly string[]).includes(prioridad)
      ? prioridad
      : "media",
    estado: "abierto",
    proyectoId: proyectoId || null,
    creadoPor: session.uid,
  });
  revalidatePath("/admin/bugs");
  revalidatePath("/admin");
}

export async function actualizarBug(
  id: string,
  data: { estado?: string; prioridad?: string },
) {
  await requireSession();
  const set: Record<string, unknown> = {};
  if (data.prioridad && (PRIORIDADES as readonly string[]).includes(data.prioridad))
    set.prioridad = data.prioridad;
  if (data.estado && (ESTADOS_BUG as readonly string[]).includes(data.estado)) {
    set.estado = data.estado;
    set.resueltoEn = data.estado === "resuelto" ? new Date().toISOString() : null;
  }
  if (Object.keys(set).length === 0) return;
  const db = getDb();
  await db.update(bugs).set(set).where(eq(bugs.id, id));
  revalidatePath("/admin/bugs");
}

export async function eliminarBug(id: string) {
  await requireSession();
  const db = getDb();
  await db.delete(bugs).where(eq(bugs.id, id));
  revalidatePath("/admin/bugs");
}

// ---------- Clientes (mini-CRM) ----------

export async function crearCliente(formData: FormData) {
  await requireSession();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  const db = getDb();
  await db.insert(clientes).values({
    id: newId(),
    nombre,
    contacto: String(formData.get("contacto") ?? "").trim() || null,
    notas: String(formData.get("notas") ?? "").trim() || null,
  });
  revalidatePath("/admin/clientes");
}

export async function actualizarCliente(id: string, formData: FormData) {
  await requireSession();
  const db = getDb();
  await db
    .update(clientes)
    .set({
      nombre: String(formData.get("nombre") ?? "").trim(),
      contacto: String(formData.get("contacto") ?? "").trim() || null,
      notas: String(formData.get("notas") ?? "").trim() || null,
    })
    .where(eq(clientes.id, id));
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
}

export async function vincularClienteProyecto(
  clienteId: string,
  proyectoId: string,
) {
  await requireSession();
  const db = getDb();
  await db
    .insert(proyectoClientes)
    .values({ clienteId, proyectoId })
    .onConflictDoNothing();
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

export async function desvincularClienteProyecto(
  clienteId: string,
  proyectoId: string,
) {
  await requireSession();
  const db = getDb();
  await db
    .delete(proyectoClientes)
    .where(
      and(
        eq(proyectoClientes.clienteId, clienteId),
        eq(proyectoClientes.proyectoId, proyectoId),
      ),
    );
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

// ---------- GitHub por socio ----------

export async function desconectarGithub() {
  const session = await requireSession();
  const db = getDb();
  await db.delete(githubCuentas).where(eq(githubCuentas.usuarioId, session.uid));
  revalidatePath("/admin/perfil");
}

// Acepta "owner/repo", una URL completa de GitHub, o con ".git", y normaliza a
// "owner/repo". Devuelve null si no puede extraer un par válido.
function normalizeRepo(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  s = s.replace(/\.git$/i, "").replace(/\/+$/, "");
  const m = s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

// Vincula un repo YA existente (de la cuenta del creador) a la idea, usando su
// user token OAuth. No requiere Installation ID de GitHub App.
export async function vincularRepoExistente(
  proyectoId: string,
  repoInput: string,
): Promise<{ ok: boolean; error?: string; repo?: string; url?: string }> {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();

  const repo = normalizeRepo(repoInput);
  if (!repo)
    return { ok: false, error: "Formato inválido. Usa owner/repo o la URL." };

  const proj = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj) return { ok: false, error: "Proyecto no encontrado" };
  if (!proj.creadoPor)
    return { ok: false, error: "La idea no tiene creador asignado" };

  const token = await getUserToken(env, proj.creadoPor);
  if (!token)
    return {
      ok: false,
      error: "El creador de la idea debe conectar su GitHub en Perfil",
    };

  let info;
  try {
    info = await getRepo(token, repo);
  } catch (e) {
    console.error("[vincularRepoExistente]", e);
    return {
      ok: false,
      error: "No se pudo acceder al repo (¿existe y el creador tiene acceso?)",
    };
  }

  await db
    .update(proyectos)
    .set({
      repoGithub: info.full_name,
      installationId: null,
      milestoneId: null,
      milestoneTitulo: null,
    })
    .where(eq(proyectos.id, proyectoId));

  await db.insert(eventosProgreso).values({
    id: newId(),
    proyectoId,
    tipo: "repo",
    descripcion: `Repositorio vinculado: ${info.full_name}.`,
  });

  await refrescarProgreso(proyectoId);
  revalidatePath(`/admin/proyectos/${proyectoId}`);
  revalidatePath("/admin/kanban");
  return { ok: true, repo: info.full_name, url: info.html_url };
}

// Crea el repo en la cuenta del socio que CREÓ la idea. Devuelve resultado.
export async function crearRepoParaIdea(
  proyectoId: string,
): Promise<{ ok: boolean; error?: string; repo?: string; url?: string }> {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();

  const proj = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj) return { ok: false, error: "Proyecto no encontrado" };
  if (proj.repoGithub) return { ok: false, error: "Ya tiene repositorio" };
  if (!proj.creadoPor)
    return { ok: false, error: "La idea no tiene creador asignado" };

  const token = await getUserToken(env, proj.creadoPor);
  if (!token)
    return {
      ok: false,
      error: "El creador de la idea debe conectar su GitHub en Perfil",
    };

  try {
    const repo = await createRepo(token, {
      name: slugRepo(proj.nombre),
      description: proj.descripcion ?? `Proyecto SacorTech: ${proj.nombre}`,
      private: true,
    });

    await db
      .update(proyectos)
      .set({ repoGithub: repo.full_name })
      .where(eq(proyectos.id, proyectoId));

    // Webhook opcional (necesita host público en APP_URL).
    if (env.APP_URL && env.GITHUB_WEBHOOK_SECRET) {
      try {
        await createWebhook(token, repo.full_name, {
          url: new URL("/api/webhooks/github", env.APP_URL).toString(),
          secret: env.GITHUB_WEBHOOK_SECRET,
        });
      } catch (e) {
        console.error("[crearRepoParaIdea] webhook", e);
      }
    }

    await db.insert(eventosProgreso).values({
      id: newId(),
      proyectoId,
      tipo: "repo",
      descripcion: `Repositorio creado: ${repo.full_name}.`,
    });

    revalidatePath(`/admin/proyectos/${proyectoId}`);
    revalidatePath("/admin/kanban");
    return { ok: true, repo: repo.full_name, url: repo.html_url };
  } catch (e) {
    console.error("[crearRepoParaIdea]", e);
    return { ok: false, error: "Fallo al crear el repo en GitHub" };
  }
}

// ---------- IA: desglose de ideas en issues (curación) ----------

export async function generarPropuestas(
  proyectoId: string,
): Promise<{ ok: boolean; n?: number; error?: string }> {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();

  const proj = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj) return { ok: false, error: "Proyecto no encontrado" };

  const comentarios = await db
    .select({ texto: ideasComentarios.texto, autor: usuarios.nombre })
    .from(ideasComentarios)
    .leftJoin(usuarios, eq(usuarios.id, ideasComentarios.autorId))
    .where(eq(ideasComentarios.proyectoId, proyectoId))
    .all();

  let sugeridos;
  try {
    sugeridos = await desglosarIdea(env, {
      titulo: proj.nombre,
      descripcion: proj.descripcion,
      comentarios: comentarios.map((c) => ({
        autor: c.autor ?? "Socio",
        texto: c.texto,
      })),
    });
  } catch (e) {
    console.error("[generarPropuestas] AI", e);
    return { ok: false, error: "La IA no pudo procesar la idea" };
  }
  if (sugeridos.length === 0)
    return { ok: false, error: "La IA no devolvió propuestas válidas" };

  // Reemplaza las propuestas pendientes previas (conserva aceptadas/creadas).
  await db
    .delete(issuesPropuestos)
    .where(
      and(
        eq(issuesPropuestos.proyectoId, proyectoId),
        eq(issuesPropuestos.estado, "propuesto"),
      ),
    );

  for (const s of sugeridos) {
    await db.insert(issuesPropuestos).values({
      id: newId(),
      proyectoId,
      titulo: s.titulo,
      cuerpo: s.cuerpo,
      origen: "ia",
      estado: "propuesto",
    });
  }

  revalidatePath(`/admin/proyectos/${proyectoId}`);
  return { ok: true, n: sugeridos.length };
}

export async function marcarPropuesta(
  id: string,
  estado: "aceptado" | "descartado" | "propuesto",
) {
  await requireSession();
  const db = getDb();
  const row = await db
    .select({ proyectoId: issuesPropuestos.proyectoId })
    .from(issuesPropuestos)
    .where(eq(issuesPropuestos.id, id))
    .get();
  await db
    .update(issuesPropuestos)
    .set({ estado })
    .where(eq(issuesPropuestos.id, id));
  if (row) revalidatePath(`/admin/proyectos/${row.proyectoId}`);
}

// Crea en GitHub los issues aceptados que aún no existen.
export async function crearIssuesAceptados(
  proyectoId: string,
): Promise<{ ok: boolean; creados?: number; error?: string }> {
  await requireSession();
  const { env } = getCloudflareContext();
  const db = getDb();

  const proj = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.id, proyectoId))
    .get();
  if (!proj?.repoGithub)
    return { ok: false, error: "Primero crea el repositorio" };
  if (!proj.creadoPor) return { ok: false, error: "Idea sin creador" };

  const token = await getUserToken(env, proj.creadoPor);
  if (!token)
    return { ok: false, error: "El creador debe conectar su GitHub" };

  const pendientes = await db
    .select()
    .from(issuesPropuestos)
    .where(
      and(
        eq(issuesPropuestos.proyectoId, proyectoId),
        eq(issuesPropuestos.estado, "aceptado"),
      ),
    )
    .all();

  let creados = 0;
  for (const p of pendientes) {
    if (p.githubIssueNumber) continue;
    try {
      const issue = await createIssue(token, proj.repoGithub, {
        title: p.titulo,
        body: p.cuerpo,
      });
      await db
        .update(issuesPropuestos)
        .set({
          githubIssueNumber: issue.number,
          githubIssueUrl: issue.html_url,
        })
        .where(eq(issuesPropuestos.id, p.id));
      creados++;
    } catch (e) {
      console.error("[crearIssuesAceptados]", e);
    }
  }

  if (creados > 0) await refrescarProgreso(proyectoId);
  revalidatePath(`/admin/proyectos/${proyectoId}`);
  return { ok: true, creados };
}
