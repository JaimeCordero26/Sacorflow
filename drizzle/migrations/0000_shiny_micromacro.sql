CREATE TABLE `clientes` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`contacto` text,
	`notas` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `etapas` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `eventos_progreso` (
	`id` text PRIMARY KEY NOT NULL,
	`proyecto_id` text NOT NULL,
	`tipo` text NOT NULL,
	`descripcion` text NOT NULL,
	`progreso_pct` integer,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `eventos_proyecto_idx` ON `eventos_progreso` (`proyecto_id`);--> statement-breakpoint
CREATE TABLE `ideas_comentarios` (
	`id` text PRIMARY KEY NOT NULL,
	`proyecto_id` text NOT NULL,
	`autor_id` text NOT NULL,
	`texto` text NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`autor_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mensajes_chat` (
	`id` text PRIMARY KEY NOT NULL,
	`proyecto_id` text NOT NULL,
	`autor_tipo` text NOT NULL,
	`autor_id` text,
	`autor_nombre` text NOT NULL,
	`texto` text NOT NULL,
	`leido` integer DEFAULT false NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`autor_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mensajes_proyecto_idx` ON `mensajes_chat` (`proyecto_id`);--> statement-breakpoint
CREATE TABLE `proyecto_clientes` (
	`proyecto_id` text NOT NULL,
	`cliente_id` text NOT NULL,
	PRIMARY KEY(`proyecto_id`, `cliente_id`),
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `proyectos` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`columna_kanban` text DEFAULT 'idea' NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`repo_github` text,
	`installation_id` integer,
	`milestone_id` integer,
	`milestone_titulo` text,
	`etapa_actual` text,
	`progreso_pct` integer DEFAULT 0 NOT NULL,
	`token_publico` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_por` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`creado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proyectos_token_publico_unique` ON `proyectos` (`token_publico`);--> statement-breakpoint
CREATE UNIQUE INDEX `proyectos_token_idx` ON `proyectos` (`token_publico`);--> statement-breakpoint
CREATE INDEX `proyectos_columna_idx` ON `proyectos` (`columna_kanban`);--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_email_unique` ON `usuarios` (`email`);