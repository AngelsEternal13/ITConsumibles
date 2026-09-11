-- =============================================================================
-- SCRIPT DDL DE BASE DE DATOS PARA TURSO (SQLITE DISTRIBUIDO)
-- Sistema Web de Gestión de Impresoras, Consumibles, UPS y Compras
-- =============================================================================

-- 1. TABLA AGENCIAS
CREATE TABLE IF NOT EXISTS agencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    departamento TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Activa',
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA REGLAS DE IMPRESORAS (Configurable dinámicamente)
CREATE TABLE IF NOT EXISTS reglas_impresoras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modelo_impresora TEXT NOT NULL UNIQUE,
    tipo_consumible TEXT NOT NULL, -- Tinta | Tóner | etc.
    consumibles_requeridos_por_equipo INTEGER NOT NULL DEFAULT 2,
    ups_requerida_va INTEGER NOT NULL DEFAULT 750
);

-- 3. TABLA IMPRESORAS
CREATE TABLE IF NOT EXISTS impresoras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agencia_id INTEGER NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    estado TEXT NOT NULL DEFAULT 'Operativa', -- Operativa | Mantenimiento | Dañada
    observaciones TEXT,
    fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA CONSUMIBLES (Stock físico / Acopio en agencia)
CREATE TABLE IF NOT EXISTS consumibles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agencia_id INTEGER NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
    tipo_consumible TEXT NOT NULL, -- Tinta | Tóner
    modelo_relacionado TEXT NOT NULL,
    cantidad_disponible INTEGER NOT NULL DEFAULT 0,
    fecha_actualizacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA UPS
CREATE TABLE IF NOT EXISTS ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agencia_id INTEGER NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    capacidad_va INTEGER NOT NULL, -- 500, 750, 1000, 1500, 2200, etc.
    cantidad INTEGER NOT NULL DEFAULT 1,
    estado TEXT NOT NULL DEFAULT 'Operativo',
    fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA TRANSFERENCIAS (Historial inter-agencias)
CREATE TABLE IF NOT EXISTS transferencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agencia_origen_id INTEGER NOT NULL REFERENCES agencias(id),
    agencia_destino_id INTEGER NOT NULL REFERENCES agencias(id),
    tipo_articulo TEXT NOT NULL, -- consumible | ups | impresora
    descripcion TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario TEXT NOT NULL
);

-- 7. TABLA COMPRAS ADICIONALES
CREATE TABLE IF NOT EXISTS compras_adicionales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descripcion TEXT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    observaciones TEXT,
    prioridad TEXT NOT NULL DEFAULT 'Media', -- Alta | Media | Baja
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'lector', -- admin | lector
    fecha_creacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLA BITÁCORA DE AUDITORÍA
CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    accion TEXT NOT NULL, -- CREATE | UPDATE | DELETE | TRANSFER
    tabla TEXT NOT NULL,
    registro_id TEXT,
    valor_anterior TEXT, -- Formato JSON
    valor_nuevo TEXT, -- Formato JSON
    fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
