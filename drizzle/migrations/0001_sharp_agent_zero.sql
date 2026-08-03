CREATE TABLE `github_cuentas` (
	`usuario_id` text PRIMARY KEY NOT NULL,
	`github_login` text NOT NULL,
	`github_user_id` integer NOT NULL,
	`avatar_url` text,
	`access_token_enc` text NOT NULL,
	`token_exp` text,
	`refresh_token_enc` text,
	`refresh_exp` text,
	`scope` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `issues_propuestos` (
	`id` text PRIMARY KEY NOT NULL,
	`proyecto_id` text NOT NULL,
	`titulo` text NOT NULL,
	`cuerpo` text DEFAULT '' NOT NULL,
	`origen` text DEFAULT 'ia' NOT NULL,
	`estado` text DEFAULT 'propuesto' NOT NULL,
	`github_issue_number` integer,
	`github_issue_url` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `issues_propuestos_proyecto_idx` ON `issues_propuestos` (`proyecto_id`);