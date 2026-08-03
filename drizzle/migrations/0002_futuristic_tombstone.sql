CREATE TABLE `bugs` (
	`id` text PRIMARY KEY NOT NULL,
	`titulo` text NOT NULL,
	`descripcion` text,
	`prioridad` text DEFAULT 'media' NOT NULL,
	`estado` text DEFAULT 'abierto' NOT NULL,
	`proyecto_id` text,
	`creado_por` text,
	`github_issue_number` integer,
	`github_issue_url` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`resuelto_en` text,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`creado_por`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bugs_estado_idx` ON `bugs` (`estado`);--> statement-breakpoint
CREATE INDEX `bugs_proyecto_idx` ON `bugs` (`proyecto_id`);