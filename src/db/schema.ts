import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

// --- Usuarios (los dos socios) ---
export const usuarios = sqliteTable("usuarios", {
  id: text("id").primaryKey(), // uuid
  nombre: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  creadoEn: text("creado_en").notNull().default(now),
});

// --- Clientes / empresas (mini-CRM) ---
export const clientes = sqliteTable("clientes", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  contacto: text("contacto"), // email/teléfono libre
  notas: text("notas"),
  creadoEn: text("creado_en").notNull().default(now),
});

// --- Etapas configurables (Módulo 4) ---
export const etapas = sqliteTable("etapas", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  orden: integer("orden").notNull().default(0),
});

export type ColumnaKanban = "idea" | "en_progreso" | "listo" | "pausado"| "cancelado" | "entregado" | "cerrado";

// --- Proyectos ---
export const proyectos = sqliteTable(
  "proyectos",
  {
    id: text("id").primaryKey(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    columnaKanban: text("columna_kanban").notNull().default("idea"),
    orden: integer("orden").notNull().default(0), // posición dentro de la columna

    // GitHub (Módulo 3)
    repoGithub: text("repo_github"), // "owner/repo"
    installationId: integer("installation_id"),
    milestoneId: integer("milestone_id"),
    milestoneTitulo: text("milestone_titulo"),

    // Gestión (Módulo 4)
    etapaActual: text("etapa_actual"),
    progresoPct: integer("progreso_pct").notNull().default(0),
    tokenPublico: text("token_publico").notNull().unique(),
    activo: integer("activo", { mode: "boolean" }).notNull().default(true),

    creadoPor: text("creado_por").references(() => usuarios.id),
    creadoEn: text("creado_en").notNull().default(now),
  },
  (t) => [
    uniqueIndex("proyectos_token_idx").on(t.tokenPublico),
    index("proyectos_columna_idx").on(t.columnaKanban),
  ],
);

// --- Pivote proyecto <-> cliente (muchos a muchos) ---
export const proyectoClientes = sqliteTable(
  "proyecto_clientes",
  {
    proyectoId: text("proyecto_id")
      .notNull()
      .references(() => proyectos.id, { onDelete: "cascade" }),
    clienteId: text("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.proyectoId, t.clienteId] })],
);

// --- Comentarios en tarjetas kanban ---
export const ideasComentarios = sqliteTable("ideas_comentarios", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id")
    .notNull()
    .references(() => proyectos.id, { onDelete: "cascade" }),
  autorId: text("autor_id")
    .notNull()
    .references(() => usuarios.id),
  texto: text("texto").notNull(),
  creadoEn: text("creado_en").notNull().default(now),
});

// --- Cuentas GitHub por socio (OAuth user-to-server) ---
export const githubCuentas = sqliteTable("github_cuentas", {
  usuarioId: text("usuario_id")
    .primaryKey()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  githubLogin: text("github_login").notNull(),
  githubUserId: integer("github_user_id").notNull(),
  avatarUrl: text("avatar_url"),
  accessTokenEnc: text("access_token_enc").notNull(), // AES-GCM
  tokenExp: text("token_exp"), // ISO, null = sin expiración
  refreshTokenEnc: text("refresh_token_enc"), // AES-GCM
  refreshExp: text("refresh_exp"),
  scope: text("scope"),
  creadoEn: text("creado_en").notNull().default(now),
});

// --- Issues propuestos por la IA sobre una idea (curación) ---
export const issuesPropuestos = sqliteTable(
  "issues_propuestos",
  {
    id: text("id").primaryKey(),
    proyectoId: text("proyecto_id")
      .notNull()
      .references(() => proyectos.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    cuerpo: text("cuerpo").notNull().default(""),
    origen: text("origen").notNull().default("ia"), // "ia" | "manual"
    estado: text("estado").notNull().default("propuesto"), // propuesto | aceptado | descartado
    githubIssueNumber: integer("github_issue_number"),
    githubIssueUrl: text("github_issue_url"),
    creadoEn: text("creado_en").notNull().default(now),
  },
  (t) => [index("issues_propuestos_proyecto_idx").on(t.proyectoId)],
);

// --- Bug tracker global (errores) ---
// Independiente de las propuestas IA. Un error puede o no ligarse a un proyecto
// (p.ej. bugs de garantía tras entregar). Prioridad para atacarlos por orden.
export const bugs = sqliteTable(
  "bugs",
  {
    id: text("id").primaryKey(),
    titulo: text("titulo").notNull(),
    descripcion: text("descripcion"),
    prioridad: text("prioridad").notNull().default("media"), // alta | media | baja
    estado: text("estado").notNull().default("abierto"), // abierto | en_progreso | resuelto
    proyectoId: text("proyecto_id").references(() => proyectos.id, {
      onDelete: "set null",
    }),
    creadoPor: text("creado_por").references(() => usuarios.id),
    githubIssueNumber: integer("github_issue_number"),
    githubIssueUrl: text("github_issue_url"),
    creadoEn: text("creado_en").notNull().default(now),
    resueltoEn: text("resuelto_en"),
  },
  (t) => [
    index("bugs_estado_idx").on(t.estado),
    index("bugs_proyecto_idx").on(t.proyectoId),
  ],
);

// --- Sprints por proyecto ---
export type ColumnaTarea = "por_hacer" | "en_progreso" | "revision" | "hecho";
export type EstadoSprint = "planificado" | "activo" | "cerrado";

export const sprints = sqliteTable(
  "sprints",
  {
    id: text("id").primaryKey(),
    proyectoId: text("proyecto_id")
      .notNull()
      .references(() => proyectos.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    estado: text("estado").notNull().default("planificado"), // planificado | activo | cerrado
    fechaInicio: text("fecha_inicio"),
    fechaFin: text("fecha_fin"),
    orden: integer("orden").notNull().default(0),
    creadoEn: text("creado_en").notNull().default(now),
    cerradoEn: text("cerrado_en"),
  },
  (t) => [
    index("sprints_proyecto_idx").on(t.proyectoId),
    index("sprints_estado_idx").on(t.estado),
  ],
);

// --- Tareas del tablero de trabajo (sprints + backlog) ---
export const tareas = sqliteTable(
  "tareas",
  {
    id: text("id").primaryKey(),
    proyectoId: text("proyecto_id")
      .notNull()
      .references(() => proyectos.id, { onDelete: "cascade" }),
    sprintId: text("sprint_id").references(() => sprints.id, {
      onDelete: "set null", // null = backlog
    }),
    titulo: text("titulo").notNull(),
    descripcion: text("descripcion"),
    columnaKanban: text("columna_kanban").notNull().default("por_hacer"),
    orden: integer("orden").notNull().default(0),
    origen: text("origen").notNull().default("manual"), // manual | github_import | ia_propuesta
    githubIssueNumber: integer("github_issue_number"),
    githubIssueUrl: text("github_issue_url"),
    githubIssueState: text("github_issue_state"), // "open" | "closed"
    creadoPor: text("creado_por").references(() => usuarios.id),
    creadoEn: text("creado_en").notNull().default(now),
    actualizadoEn: text("actualizado_en").notNull().default(now),
  },
  (t) => [
    index("tareas_proyecto_idx").on(t.proyectoId),
    index("tareas_sprint_idx").on(t.sprintId),
    index("tareas_columna_idx").on(t.columnaKanban),
    index("tareas_proyecto_issue_idx").on(t.proyectoId, t.githubIssueNumber),
  ],
);

// --- Historial de eventos de progreso (Módulo 3) ---
export const eventosProgreso = sqliteTable(
  "eventos_progreso",
  {
    id: text("id").primaryKey(),
    proyectoId: text("proyecto_id")
      .notNull()
      .references(() => proyectos.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(), // issue_closed | milestone_updated | push | progreso | ...
    descripcion: text("descripcion").notNull(), // texto amigable para el cliente
    progresoPct: integer("progreso_pct"), // snapshot en el momento del evento
    creadoEn: text("creado_en").notNull().default(now),
  },
  (t) => [index("eventos_proyecto_idx").on(t.proyectoId)],
);

// --- Mensajes de chat (Módulo 7) ---
export const mensajesChat = sqliteTable(
  "mensajes_chat",
  {
    id: text("id").primaryKey(),
    proyectoId: text("proyecto_id")
      .notNull()
      .references(() => proyectos.id, { onDelete: "cascade" }),
    autorTipo: text("autor_tipo").notNull(), // "cliente" | "socio"
    autorId: text("autor_id").references(() => usuarios.id), // null si es cliente
    autorNombre: text("autor_nombre").notNull(), // "Cliente" o nombre del socio
    texto: text("texto").notNull(),
    leido: integer("leido", { mode: "boolean" }).notNull().default(false),
    creadoEn: text("creado_en").notNull().default(now),
  },
  (t) => [index("mensajes_proyecto_idx").on(t.proyectoId)],
);

export type Usuario = typeof usuarios.$inferSelect;
export type Cliente = typeof clientes.$inferSelect;
export type Etapa = typeof etapas.$inferSelect;
export type Proyecto = typeof proyectos.$inferSelect;
export type IdeaComentario = typeof ideasComentarios.$inferSelect;
export type EventoProgreso = typeof eventosProgreso.$inferSelect;
export type MensajeChat = typeof mensajesChat.$inferSelect;
export type GithubCuenta = typeof githubCuentas.$inferSelect;
export type IssuePropuesto = typeof issuesPropuestos.$inferSelect;
export type Bug = typeof bugs.$inferSelect;
export type Sprint = typeof sprints.$inferSelect;
export type Tarea = typeof tareas.$inferSelect;
