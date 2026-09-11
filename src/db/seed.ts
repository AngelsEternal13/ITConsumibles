import { db } from "./client";
import {
  agencias,
  impresoras,
  consumibles,
  ups,
  reglasImpresoras,
  transferencias,
  comprasAdicionales,
  usuarios,
  auditoria,
} from "./schema";
import bcrypt from "bcryptjs";

export async function seed() {
  console.log("Iniciando sembrado de datos...");

  // 1. Limpiar o asegurar tablas
  // Crear usuarios de prueba
  const hashedAdminPassword = await bcrypt.hash("admin123", 10);
  const hashedLectorPassword = await bcrypt.hash("lector123", 10);

  console.log("Creando usuarios por defecto...");
  await db.insert(usuarios).values([
    {
      nombre: "Administrador IT",
      correo: "admin@empresa.com",
      password: hashedAdminPassword,
      rol: "admin",
    },
    {
      nombre: "Auditor / Lector",
      correo: "lector@empresa.com",
      password: hashedLectorPassword,
      rol: "lector",
    },
  ]).onConflictDoNothing();

  // 2. Reglas de impresoras iniciales
  console.log("Creando reglas automáticas de impresoras...");
  const reglasData = [
    {
      modelo_impresora: "L3250",
      tipo_consumible: "Tinta",
      consumibles_requeridos_por_equipo: 2, // 2 paquetes por impresora
      ups_requerida_va: 500, // 500 VA
    },
    {
      modelo_impresora: "HP 107W",
      tipo_consumible: "Tóner",
      consumibles_requeridos_por_equipo: 2,
      ups_requerida_va: 750, // 750 VA
    },
    {
      modelo_impresora: "LBP6030",
      tipo_consumible: "Tóner",
      consumibles_requeridos_por_equipo: 2,
      ups_requerida_va: 750,
    },
    {
      modelo_impresora: "MF244",
      tipo_consumible: "Tóner",
      consumibles_requeridos_por_equipo: 2,
      ups_requerida_va: 1500, // 1500 VA
    },
    {
      modelo_impresora: "MF440",
      tipo_consumible: "Tóner",
      consumibles_requeridos_por_equipo: 2,
      ups_requerida_va: 1500,
    },
    {
      modelo_impresora: "MF455",
      tipo_consumible: "Tóner",
      consumibles_requeridos_por_equipo: 2,
      ups_requerida_va: 1500,
    },
    {
      modelo_impresora: "IR1643",
      tipo_consumible: "Tóner",
      consumibles_requeridos_por_equipo: 2,
      ups_requerida_va: 1500,
    },
    {
      modelo_impresora: "Canon 1620",
      tipo_consumible: "Tóner",
      consumibles_requeridos_por_equipo: 2,
      ups_requerida_va: 1500,
    },
  ];

  for (const regla of reglasData) {
    await db.insert(reglasImpresoras).values(regla).onConflictDoNothing();
  }

  // 3. Agencias
  console.log("Creando agencias...");
  const agenciasList = [
    { nombre: "El Rama", departamento: "RACCS", estado: "Activa" },
    { nombre: "Jinotega", departamento: "Jinotega", estado: "Activa" },
    { nombre: "La Dalia", departamento: "Matagalpa", estado: "Activa" },
    { nombre: "Matagalpa", departamento: "Matagalpa", estado: "Activa" },
    { nombre: "Nueva Guinea", departamento: "RACCS", estado: "Activa" },
    { nombre: "Ocotal", departamento: "Nueva Segovia", estado: "Activa" },
    { nombre: "Wiwilí", departamento: "Jinotega", estado: "Activa" },
    { nombre: "El Cuá", departamento: "Jinotega", estado: "Activa" },
  ];

  const agenciasInsertadas = await db.insert(agencias).values(agenciasList).returning();
  const getAgenciaId = (nombre: string) => agenciasInsertadas.find((a) => a.nombre === nombre)?.id || 1;

  // 4. Impresoras
  console.log("Registrando impresoras...");
  await db.insert(impresoras).values([
    // Matagalpa
    { agencia_id: getAgenciaId("Matagalpa"), marca: "Epson", modelo: "L3250", cantidad: 10, estado: "Operativa", observaciones: "Estaciones de atención al cliente" },
    { agencia_id: getAgenciaId("Matagalpa"), marca: "Canon", modelo: "MF455", cantidad: 4, estado: "Operativa", observaciones: "Área de crédito y contabilidad" },
    { agencia_id: getAgenciaId("Matagalpa"), marca: "HP", modelo: "HP 107W", cantidad: 6, estado: "Operativa", observaciones: "Cajas rápidas" },

    // Jinotega
    { agencia_id: getAgenciaId("Jinotega"), marca: "Canon", modelo: "LBP6030", cantidad: 8, estado: "Operativa", observaciones: "Mostrador principal" },
    { agencia_id: getAgenciaId("Jinotega"), marca: "Canon", modelo: "MF244", cantidad: 3, estado: "Operativa", observaciones: "Gerencia y operaciones" },
    { agencia_id: getAgenciaId("Jinotega"), marca: "Epson", modelo: "L3250", cantidad: 5, estado: "Operativa", observaciones: "Oficiales de servicio" },

    // Nueva Guinea
    { agencia_id: getAgenciaId("Nueva Guinea"), marca: "Epson", modelo: "L3250", cantidad: 10, estado: "Operativa", observaciones: "Área de cajas y atención" },
    { agencia_id: getAgenciaId("Nueva Guinea"), marca: "HP", modelo: "HP 107W", cantidad: 7, estado: "Operativa", observaciones: "Estaciones administrativas" },

    // El Rama
    { agencia_id: getAgenciaId("El Rama"), marca: "Epson", modelo: "L3250", cantidad: 8, estado: "Operativa", observaciones: "Cajas y supervisión" },
    { agencia_id: getAgenciaId("El Rama"), marca: "Canon", modelo: "IR1643", cantidad: 2, estado: "Operativa", observaciones: "Multifuncional central de alto volumen" },

    // Ocotal
    { agencia_id: getAgenciaId("Ocotal"), marca: "Canon", modelo: "LBP6030", cantidad: 6, estado: "Operativa", observaciones: "Cajeros" },
    { agencia_id: getAgenciaId("Ocotal"), marca: "Canon", modelo: "Canon 1620", cantidad: 2, estado: "Operativa", observaciones: "Documentos legales" },

    // La Dalia
    { agencia_id: getAgenciaId("La Dalia"), marca: "HP", modelo: "HP 107W", cantidad: 5, estado: "Operativa", observaciones: "Plataforma" },
    { agencia_id: getAgenciaId("La Dalia"), marca: "Epson", modelo: "L3250", cantidad: 4, estado: "Operativa", observaciones: "Oficinas" },

    // Wiwilí
    { agencia_id: getAgenciaId("Wiwilí"), marca: "Epson", modelo: "L3250", cantidad: 4, estado: "Operativa", observaciones: "Atención al usuario" },
    { agencia_id: getAgenciaId("Wiwilí"), marca: "Canon", modelo: "LBP6030", cantidad: 3, estado: "Operativa", observaciones: "Área de caja" },

    // El Cuá
    { agencia_id: getAgenciaId("El Cuá"), marca: "HP", modelo: "HP 107W", cantidad: 4, estado: "Operativa", observaciones: "Oficinas centrales" },
    { agencia_id: getAgenciaId("El Cuá"), marca: "Canon", modelo: "MF244", cantidad: 2, estado: "Operativa", observaciones: "Contabilidad" },
  ]);

  // 5. Consumibles (con casos de déficit y stock controlado para validar cálculos)
  console.log("Registrando stock de consumibles...");
  await db.insert(consumibles).values([
    // Matagalpa: 10 L3250 -> req 20, stock 13 => FALTA 7
    { agencia_id: getAgenciaId("Matagalpa"), tipo_consumible: "Tinta", modelo_relacionado: "L3250", cantidad_disponible: 13 },
    // Matagalpa: 4 MF455 -> req 8, stock 5 => FALTA 3
    { agencia_id: getAgenciaId("Matagalpa"), tipo_consumible: "Tóner", modelo_relacionado: "MF455", cantidad_disponible: 5 },
    // Matagalpa: 6 HP 107W -> req 12, stock 12 => OK (0)
    { agencia_id: getAgenciaId("Matagalpa"), tipo_consumible: "Tóner", modelo_relacionado: "HP 107W", cantidad_disponible: 12 },

    // Jinotega: 8 LBP6030 -> req 16, stock 10 => FALTA 6
    { agencia_id: getAgenciaId("Jinotega"), tipo_consumible: "Tóner", modelo_relacionado: "LBP6030", cantidad_disponible: 10 },
    // Jinotega: 3 MF244 -> req 6, stock 4 => FALTA 2
    { agencia_id: getAgenciaId("Jinotega"), tipo_consumible: "Tóner", modelo_relacionado: "MF244", cantidad_disponible: 4 },
    // Jinotega: 5 L3250 -> req 10, stock 10 => OK (0)
    { agencia_id: getAgenciaId("Jinotega"), tipo_consumible: "Tinta", modelo_relacionado: "L3250", cantidad_disponible: 10 },

    // Nueva Guinea: 10 L3250 -> req 20, stock 30 => Superávit de 10
    { agencia_id: getAgenciaId("Nueva Guinea"), tipo_consumible: "Tinta", modelo_relacionado: "L3250", cantidad_disponible: 30 },
    // Nueva Guinea: 7 HP 107W -> req 14, stock 8 => FALTA 6
    { agencia_id: getAgenciaId("Nueva Guinea"), tipo_consumible: "Tóner", modelo_relacionado: "HP 107W", cantidad_disponible: 8 },

    // El Rama: 8 L3250 -> req 16, stock 5 => FALTA 11
    { agencia_id: getAgenciaId("El Rama"), tipo_consumible: "Tinta", modelo_relacionado: "L3250", cantidad_disponible: 5 },
    // El Rama: 2 IR1643 -> req 4, stock 2 => FALTA 2
    { agencia_id: getAgenciaId("El Rama"), tipo_consumible: "Tóner", modelo_relacionado: "IR1643", cantidad_disponible: 2 },

    // Ocotal
    { agencia_id: getAgenciaId("Ocotal"), tipo_consumible: "Tóner", modelo_relacionado: "LBP6030", cantidad_disponible: 5 },
    { agencia_id: getAgenciaId("Ocotal"), tipo_consumible: "Tóner", modelo_relacionado: "Canon 1620", cantidad_disponible: 1 },

    // La Dalia
    { agencia_id: getAgenciaId("La Dalia"), tipo_consumible: "Tóner", modelo_relacionado: "HP 107W", cantidad_disponible: 4 },
    { agencia_id: getAgenciaId("La Dalia"), tipo_consumible: "Tinta", modelo_relacionado: "L3250", cantidad_disponible: 6 },

    // Wiwilí
    { agencia_id: getAgenciaId("Wiwilí"), tipo_consumible: "Tinta", modelo_relacionado: "L3250", cantidad_disponible: 3 },
    { agencia_id: getAgenciaId("Wiwilí"), tipo_consumible: "Tóner", modelo_relacionado: "LBP6030", cantidad_disponible: 2 },

    // El Cuá
    { agencia_id: getAgenciaId("El Cuá"), tipo_consumible: "Tóner", modelo_relacionado: "HP 107W", cantidad_disponible: 3 },
    { agencia_id: getAgenciaId("El Cuá"), tipo_consumible: "Tóner", modelo_relacionado: "MF244", cantidad_disponible: 1 },
  ]);

  // 6. UPS
  console.log("Registrando UPS existentes...");
  await db.insert(ups).values([
    // Matagalpa: 10 L3250 (500VA), 6 HP 107W (750VA), 4 MF455 (1500VA)
    { agencia_id: getAgenciaId("Matagalpa"), marca: "Forza", modelo: "NT-511", capacidad_va: 500, cantidad: 6, estado: "Operativo" }, // Falta 4
    { agencia_id: getAgenciaId("Matagalpa"), marca: "Forza", modelo: "NT-751", capacidad_va: 750, cantidad: 6, estado: "Operativo" }, // Ok
    { agencia_id: getAgenciaId("Matagalpa"), marca: "Forza", modelo: "FX-1500LCD", capacidad_va: 1500, cantidad: 2, estado: "Operativo" }, // Falta 2

    // Jinotega: 8 LBP6030 (750VA), 3 MF244 (1500VA), 5 L3250 (500VA)
    { agencia_id: getAgenciaId("Jinotega"), marca: "Forza", modelo: "NT-511D", capacidad_va: 500, cantidad: 5, estado: "Operativo" }, // Ok
    { agencia_id: getAgenciaId("Jinotega"), marca: "Forza", modelo: "NT-751", capacidad_va: 750, cantidad: 5, estado: "Operativo" }, // Falta 3
    { agencia_id: getAgenciaId("Jinotega"), marca: "Forza", modelo: "FX-1500LCD", capacidad_va: 1500, cantidad: 2, estado: "Operativo" }, // Falta 1

    // Nueva Guinea: 10 L3250 (500VA), 7 HP 107W (750VA)
    { agencia_id: getAgenciaId("Nueva Guinea"), marca: "Forza", modelo: "NT-511", capacidad_va: 500, cantidad: 10, estado: "Operativo" }, // Ok
    { agencia_id: getAgenciaId("Nueva Guinea"), marca: "Tripp Lite", modelo: "HT-750LCD", capacidad_va: 750, cantidad: 4, estado: "Operativo" }, // Falta 3

    // El Rama: 8 L3250 (500VA), 2 IR1643 (1500VA)
    { agencia_id: getAgenciaId("El Rama"), marca: "Forza", modelo: "NT-511", capacidad_va: 500, cantidad: 5, estado: "Operativo" }, // Falta 3
    { agencia_id: getAgenciaId("El Rama"), marca: "Tripp Lite", modelo: "SMART1500LCDT", capacidad_va: 1500, cantidad: 2, estado: "Operativo" }, // Ok
  ]);

  // 7. Compras Adicionales
  console.log("Registrando compras adicionales iniciales...");
  await db.insert(comprasAdicionales).values([
    { descripcion: "Mouse Ópticos USB", cantidad: 25, observaciones: "Reemplazo en ventanillas de servicio y cajas", prioridad: "Alta" },
    { descripcion: "Teclados USB estándar", cantidad: 15, observaciones: "Repuesto para agencias zona norte", prioridad: "Media" },
    { descripcion: "Discos SSD 480GB Kingston", cantidad: 8, observaciones: "Actualización de rendimiento en terminales", prioridad: "Alta" },
    { descripcion: "Memorias USB 64GB Kingston", cantidad: 12, observaciones: "Respaldos de bases de datos locales", prioridad: "Baja" },
    { descripcion: "Switches Gigabit 8 Puertos", cantidad: 5, observaciones: "Ampliación de red en El Rama y Nueva Guinea", prioridad: "Alta" },
    { descripcion: "Cable USB para Impresoras 1.8m", cantidad: 20, observaciones: "Reemplazo de cables dañados", prioridad: "Media" },
  ]);

  // 8. Transferencias iniciales
  console.log("Registrando historial de transferencias...");
  await db.insert(transferencias).values([
    {
      agencia_origen_id: getAgenciaId("Nueva Guinea"),
      agencia_destino_id: getAgenciaId("El Rama"),
      tipo_articulo: "consumible",
      descripcion: "Tintas L3250",
      cantidad: 17,
      usuario: "admin@empresa.com",
    },
    {
      agencia_origen_id: getAgenciaId("Matagalpa"),
      agencia_destino_id: getAgenciaId("Jinotega"),
      tipo_articulo: "consumible",
      descripcion: "Tóner HP 107W",
      cantidad: 2,
      usuario: "admin@empresa.com",
    },
  ]);

  // 9. Registro de auditoría inicial
  console.log("Registrando bitácora de auditoría...");
  await db.insert(auditoria).values([
    {
      usuario: "admin@empresa.com",
      accion: "CREATE",
      tabla: "sistema",
      registro_id: "init",
      valor_anterior: null,
      valor_nuevo: JSON.stringify({ mensaje: "Inicialización del sistema y carga de datos maestros" }),
    },
    {
      usuario: "admin@empresa.com",
      accion: "TRANSFER",
      tabla: "transferencias",
      registro_id: "1",
      valor_anterior: JSON.stringify({ origen: "Nueva Guinea", cantidad: 17 }),
      valor_nuevo: JSON.stringify({ destino: "El Rama", cantidad: 17 }),
    },
  ]);

  console.log("Sembrado de datos finalizado con éxito!");
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error sembrando datos:", err);
      process.exit(1);
    });
}
