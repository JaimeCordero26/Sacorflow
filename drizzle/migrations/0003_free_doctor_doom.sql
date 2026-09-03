CREATE TABLE `sprints` (
	`id` text PRIMARY KEY NOT NULL,
	`proyecto_id` text NOT NULL,
	`nombre` text NOT NULL,
	`estado` text DEFAULT 'planificado' NOT NULL,
	`fecha_inicio` text,
	`fecha_fin` text,
	`orden` integer DEFAULT 0 NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`cerrado_en` text,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sprints_proyecto_idx` ON `sprints` (`proyecto_id`);--> statement-breakpoint
CREATE INDEX `sprints_estado_idx` ON `sprints` (`estado`);--> statement-breakpoint
CREATE TABLE `tareas` (
	`id` text PRIMARY KEY NOT NULL,
	`proyecto_id` text NOT NULL,
	`sprint_id` text,
	`titulo` text NOT NULL,
	`descripcion` text,
	`columna_kanban` text DEFAULT 'por_hacer' NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`origen` text DEFAULT 'manual' NOT NULL,
	`github_issue_number` integer,
	`github_issue_url` text,
	`github_issue_state` text,
	`creado_por` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`actualizado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sprint_id`) REFERENCES `sprints`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`creado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tareas_proyecto_idx` ON `tareas` (`proyecto_id`);--> statement-breakpoint
CREATE INDEX `tareas_sprint_idx` ON `tareas` (`sprint_id`);--> statement-breakpoint
CREATE INDEX `tareas_columna_idx` ON `tareas` (`columna_kanban`);--> statement-breakpoint
CREATE INDEX `tareas_proyecto_issue_idx` ON `tareas` (`proyecto_id`,`github_issue_number`);