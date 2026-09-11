CREATE TABLE `agencias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`departamento` text NOT NULL,
	`estado` text DEFAULT 'Activa' NOT NULL,
	`fecha_creacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auditoria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usuario` text NOT NULL,
	`accion` text NOT NULL,
	`tabla` text NOT NULL,
	`registro_id` text,
	`valor_anterior` text,
	`valor_nuevo` text,
	`fecha` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `compras_adicionales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`descripcion` text NOT NULL,
	`cantidad` integer DEFAULT 1 NOT NULL,
	`observaciones` text,
	`prioridad` text DEFAULT 'Media' NOT NULL,
	`fecha_creacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `consumibles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agencia_id` integer NOT NULL,
	`tipo_consumible` text NOT NULL,
	`modelo_relacionado` text NOT NULL,
	`cantidad_disponible` integer DEFAULT 0 NOT NULL,
	`fecha_actualizacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agencia_id`) REFERENCES `agencias`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `impresoras` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agencia_id` integer NOT NULL,
	`marca` text NOT NULL,
	`modelo` text NOT NULL,
	`cantidad` integer DEFAULT 1 NOT NULL,
	`estado` text DEFAULT 'Operativa' NOT NULL,
	`observaciones` text,
	`fecha_registro` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agencia_id`) REFERENCES `agencias`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reglas_impresoras` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`modelo_impresora` text NOT NULL,
	`tipo_consumible` text NOT NULL,
	`consumibles_requeridos_por_equipo` integer DEFAULT 2 NOT NULL,
	`ups_requerida_va` integer DEFAULT 750 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reglas_impresoras_modelo_impresora_unique` ON `reglas_impresoras` (`modelo_impresora`);--> statement-breakpoint
CREATE TABLE `transferencias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agencia_origen_id` integer NOT NULL,
	`agencia_destino_id` integer NOT NULL,
	`tipo_articulo` text NOT NULL,
	`descripcion` text NOT NULL,
	`cantidad` integer NOT NULL,
	`fecha` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`usuario` text NOT NULL,
	FOREIGN KEY (`agencia_origen_id`) REFERENCES `agencias`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agencia_destino_id`) REFERENCES `agencias`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agencia_id` integer NOT NULL,
	`marca` text NOT NULL,
	`modelo` text NOT NULL,
	`capacidad_va` integer NOT NULL,
	`cantidad` integer DEFAULT 1 NOT NULL,
	`estado` text DEFAULT 'Operativo' NOT NULL,
	`fecha_registro` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agencia_id`) REFERENCES `agencias`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`correo` text NOT NULL,
	`password` text NOT NULL,
	`rol` text DEFAULT 'lector' NOT NULL,
	`fecha_creacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_correo_unique` ON `usuarios` (`correo`);