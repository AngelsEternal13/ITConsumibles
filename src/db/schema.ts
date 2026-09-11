import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const agencias = sqliteTable("agencias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  departamento: text("departamento").notNull().default("Principal"),
  cantidad_acopios: integer("cantidad_acopios").notNull().default(0),
  estado: text("estado").notNull().default("Activa"), // Activa | Inactiva
  fecha_creacion: text("fecha_creacion").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const impresoras = sqliteTable("impresoras", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agencia_id: integer("agencia_id").notNull().references(() => agencias.id, { onDelete: "cascade" }),
  marca: text("marca").notNull(),
  modelo: text("modelo").notNull(),
  tipo_consumible: text("tipo_consumible").notNull().default("Tóner"), // Tinta | Tóner
  cantidad: integer("cantidad").notNull().default(1),
  estado: text("estado").notNull().default("Operativa"), // Operativa | Mantenimiento | Dañada
  observaciones: text("observaciones"),
  fecha_registro: text("fecha_registro").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const consumibles = sqliteTable("consumibles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agencia_id: integer("agencia_id").notNull().references(() => agencias.id, { onDelete: "cascade" }),
  impresora_id: integer("impresora_id").references(() => impresoras.id, { onDelete: "set null" }),
  tipo_consumible: text("tipo_consumible").notNull(), // Tinta | Tóner
  modelo_relacionado: text("modelo_relacionado").notNull(), // ej: L3250, HP 107W, etc.
  cantidad_disponible: integer("cantidad_disponible").notNull().default(0),
  fecha_actualizacion: text("fecha_actualizacion").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ups = sqliteTable("ups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agencia_id: integer("agencia_id").notNull().references(() => agencias.id, { onDelete: "cascade" }),
  impresora_id: integer("impresora_id").references(() => impresoras.id, { onDelete: "set null" }),
  marca: text("marca").notNull(),
  modelo: text("modelo").notNull(),
  capacidad_va: integer("capacidad_va").notNull(), // 500, 550, 750, 1000, 1500, 2200
  cantidad: integer("cantidad").notNull().default(1),
  estado: text("estado").notNull().default("Operativo"),
  fecha_registro: text("fecha_registro").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reglasImpresoras = sqliteTable("reglas_impresoras", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelo_impresora: text("modelo_impresora").notNull().unique(),
  tipo_consumible: text("tipo_consumible").notNull(), // Tinta | Tóner
  consumibles_requeridos_por_equipo: integer("consumibles_requeridos_por_equipo").notNull().default(2),
  ups_requerida_va: integer("ups_requerida_va").notNull().default(750),
  ups_requerida_va_alt: integer("ups_requerida_va_alt"), // Capacidad alternativa opcional (ej: 550 además de 750)
});

export const transferencias = sqliteTable("transferencias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agencia_origen_id: integer("agencia_origen_id").notNull().references(() => agencias.id),
  agencia_destino_id: integer("agencia_destino_id").notNull().references(() => agencias.id),
  tipo_articulo: text("tipo_articulo").notNull(), // consumible | ups | impresora
  descripcion: text("descripcion").notNull(),
  cantidad: integer("cantidad").notNull(),
  fecha: text("fecha").notNull().default(sql`CURRENT_TIMESTAMP`),
  usuario: text("usuario").notNull(),
});

export const comprasAdicionales = sqliteTable("compras_adicionales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  descripcion: text("descripcion").notNull(),
  cantidad: integer("cantidad").notNull().default(1),
  observaciones: text("observaciones"),
  prioridad: text("prioridad").notNull().default("Media"), // Alta | Media | Baja
  fecha_creacion: text("fecha_creacion").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const usuarios = sqliteTable("usuarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  usuario: text("usuario").unique(),
  correo: text("correo").notNull().unique(),
  password: text("password").notNull(),
  rol: text("rol").notNull().default("lector"), // admin | lector
  fecha_creacion: text("fecha_creacion").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditoria = sqliteTable("auditoria", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  usuario: text("usuario").notNull(),
  accion: text("accion").notNull(), // CREATE | UPDATE | DELETE | TRANSFER
  tabla: text("tabla").notNull(),
  registro_id: text("registro_id"),
  valor_anterior: text("valor_anterior"), // JSON
  valor_nuevo: text("valor_nuevo"), // JSON
  fecha: text("fecha").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Agencia = typeof agencias.$inferSelect;
export type NuevaAgencia = typeof agencias.$inferInsert;

export type Impresora = typeof impresoras.$inferSelect;
export type NuevaImpresora = typeof impresoras.$inferInsert;

export type Consumible = typeof consumibles.$inferSelect;
export type NuevoConsumible = typeof consumibles.$inferInsert;

export type Ups = typeof ups.$inferSelect;
export type NuevaUps = typeof ups.$inferInsert;

export type ReglaImpresora = typeof reglasImpresoras.$inferSelect;
export type NuevaReglaImpresora = typeof reglasImpresoras.$inferInsert;

export type Transferencia = typeof transferencias.$inferSelect;
export type NuevaTransferencia = typeof transferencias.$inferInsert;

export type CompraAdicional = typeof comprasAdicionales.$inferSelect;
export type NuevaCompraAdicional = typeof comprasAdicionales.$inferInsert;

export type Usuario = typeof usuarios.$inferSelect;
export type NuevoUsuario = typeof usuarios.$inferInsert;

export type Auditoria = typeof auditoria.$inferSelect;
export type NuevaAuditoria = typeof auditoria.$inferInsert;
