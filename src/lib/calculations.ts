import { Agencia, Impresora, Consumible, Ups, ReglaImpresora, CompraAdicional, Transferencia } from "@/db/schema";

export interface ConsumibleCalculoItem {
  agenciaId: number;
  agenciaNombre: string;
  departamento: string;
  acopiosAgencia: number;
  marca: string;
  modeloImpresora: string;
  esGrande?: boolean; // true si es IR1643, MF455, MF440, etc. (fija en agencia al 100%)
  cantidadImpresoras: number; // Alias retrocompatible (equipos operativos)
  cantidadImpresorasTotal: number;
  cantidadImpresorasOperativas: number; // Impresoras activas (100% si es grande; proporcional a acopios si es pequeña)
  tipoConsumible: string;
  existenciaActual: number;
  cantidadRequerida: number; // Requerimiento según operación
  cantidadAComprar: number; // Falta comprar
  cantidadSobrante: number; // Sobra en stock
  estadoAlerta: "verde" | "amarillo" | "rojo"; // verde = stock suficiente/sobra, amarillo = al límite exacto, rojo = requiere compra
}

export interface UpsCalculoItem {
  agenciaId: number;
  agenciaNombre: string;
  departamento: string;
  acopiosAgencia: number;
  marcaImpresora: string;
  modeloImpresora: string;
  esGrande?: boolean; // true si es IR1643, MF455, MF440, etc.
  cantidadImpresoras: number; // Alias retrocompatible
  cantidadImpresorasTotal: number;
  cantidadImpresorasOperativas: number;
  upsRequeridaVa: number;
  upsRequeridaVaAlt?: number | null;
  upsExistentes: number;
  upsFaltantes: number; // Falta UPS
  upsSobrantes: number; // Sobran UPS
  estadoAlerta: "verde" | "amarillo" | "rojo";
}

export interface MatrizAcopioItem {
  agenciaId: number;
  agenciaNombre: string;
  departamento: string;
  acopiosAAbrir: number; // Cantidad de acopios externos que abrirá la agencia
  acopiosTotales: number; // Acopios externos + 1 de la propia agencia que opera como agencia y acopio
  
  // Impresoras
  impresorasExistentes: number; // Total stock físico
  impresorasPequenasExistentes: number; // Impresoras portables/pequeñas para acopios (L3250, HP107, LBP6030, etc.)
  impresorasPequenasRequeridas: number; // Acopios a cubrir (acopios externos + 1 acopio en sede de agencia)
  impresorasGrandesExistentes: number; // Impresoras grandes fijas de agencia (IR1643, MF455, MF440, etc.)
  impresorasRequeridas: number; // Total requeridas (pequeñas de acopio + grandes de agencia)
  impresorasFaltantes: number; // Faltan pequeñas para cubrir los acopios
  impresorasSobrantes: number; // Sobran pequeñas tras cubrir los acopios (disponibles para transferir)
  
  // Consumibles (tóner o tinta)
  consumiblesExistentes: number;
  consumiblesRequeridos: number; // Requerimiento para acopios + impresoras de agencia
  consumiblesFaltantes: number;
  consumiblesSobrantes: number;

  // UPS (Protección eléctrica)
  upsExistentes: number;
  upsRequeridas: number; // 1 UPS por impresora activa
  upsFaltantes: number;
  upsSobrantes: number;

  // Diagnóstico integral
  estadoCobertura: "cubierto" | "al_limite" | "deficit"; // verde | amarillo | rojo
  mensajeEstado: string;
}

export interface ConsolidadoItem {
  categoria: "Consumible" | "UPS" | "Impresora" | "Compra Adicional";
  articulo: string;
  cantidad: number;
  unidad: string;
  prioridad?: string;
  observaciones?: string;
}

export interface DashboardMetrics {
  totalAgencias: number;
  totalAcopios: number;
  totalImpresoras: number;
  totalUps: number;
  totalConsumibles: number;
  totalComprasAdicionales: number;
  totalTransferencias: number;
  totalRequerimientoPendiente: number; // Consumibles faltantes + UPS faltantes + Impresoras faltantes + compras
  totalImpresorasFaltantesAcopios: number;
  ahorroPorTransferencias: number;
  alertasCriticas: number;
  agenciasConDeficit: number;
  agenciasListasAcopio: number;
}

/**
 * Normaliza nombres de modelos para coincidir de forma flexible (ej: "L3250" con "Epson L3250")
 */
export function normalizarModelo(modelo: string): string {
  return modelo.trim().toLowerCase().replace(/^(epson|hp|canon)\s+/i, "");
}

/**
 * Encuentra la regla aplicable a un modelo de impresora
 */
export function obtenerReglaParaModelo(modelo: string, reglas: ReglaImpresora[]): ReglaImpresora {
  const norm = normalizarModelo(modelo);
  const encontrada = reglas.find((r) => {
    const regNorm = normalizarModelo(r.modelo_impresora);
    return norm.includes(regNorm) || regNorm.includes(norm);
  });

  if (encontrada) return encontrada;

  // Regla por defecto si es modelo nuevo aún no configurado
  const esTinta = /tinta|l3|ecotank/i.test(modelo);
  return {
    id: 0,
    modelo_impresora: modelo,
    tipo_consumible: esTinta ? "Tinta" : "Tóner",
    consumibles_requeridos_por_equipo: 2,
    ups_requerida_va: esTinta ? 500 : 750,
    ups_requerida_va_alt: esTinta ? 750 : null,
  };
}

/**
 * Determina si una impresora es un modelo grande/departamental de agencia central
 * (ej: Canon IR1643, MF455, MF440, MF244, Canon 1620, fotocopiadoras departamentales).
 * EXCEPCIÓN: Estas impresoras permanecen siempre fijas en la agencia al 100% de su capacidad
 * independientemente de cuántos acopios externos se habiliten.
 */
export function esImpresoraGrande(modelo: string, regla?: ReglaImpresora): boolean {
  if (regla && regla.ups_requerida_va >= 1500) {
    return true;
  }
  const m = modelo.trim().toUpperCase().replace(/[\s\-_]/g, "");
  return (
    /\b(IR\d+|MF\d+|MFP|1620|TASKALFA|ADVANCE|IMAGECLASS|IMAGERUNNER)\b/i.test(modelo) ||
    /^CANON(IR|MF|1620)/i.test(m) ||
    /^(IR|MF)\d+/i.test(m) ||
    /^(IR|MF)/i.test(m.replace(/^(CANON|HP|EPSON)/i, ""))
  );
}

/**
 * Calcula requerimientos de consumibles por agencia y modelo.
 * REGLAS DE NEGOCIO:
 * 1. Excepción Impresoras Grandes (IR1643, MF455, MF440, etc.):
 *    Se usan solo en agencias y permanecen fijas al 100% de su capacidad física siempre.
 * 2. Impresoras Pequeñas (L3250, HP 107W, LBP6030, etc.):
 *    Cubren los acopios externos programados MÁS 1 impresora pequeña para la propia agencia
 *    (ya que opera como sede y como acopio local).
 */
export function calcularConsumibles(
  agencias: Agencia[],
  impresoras: Impresora[],
  consumibles: Consumible[],
  reglas: ReglaImpresora[]
): ConsumibleCalculoItem[] {
  const resultados: ConsumibleCalculoItem[] = [];

  for (const ag of agencias) {
    if (ag.estado !== "Activa") continue;

    const impresorasAgencia = impresoras.filter((imp) => imp.agencia_id === ag.id);
    const consumiblesAgencia = consumibles.filter((c) => c.agencia_id === ag.id);
    const acopios = ag.cantidad_acopios || 0;

    // Agrupar impresoras por modelo en la agencia
    const modelosMap = new Map<string, { marca: string; cantidad: number }>();
    for (const imp of impresorasAgencia) {
      const actual = modelosMap.get(imp.modelo) || { marca: imp.marca, cantidad: 0 };
      actual.cantidad += imp.cantidad;
      modelosMap.set(imp.modelo, actual);
    }

    // Clasificar modelos en grandes (fijas en agencia) y pequeños (acopios y sede)
    const modelosGrandes: string[] = [];
    const modelosPequenos: string[] = [];

    for (const modelo of modelosMap.keys()) {
      const regla = obtenerReglaParaModelo(modelo, reglas);
      if (esImpresoraGrande(modelo, regla)) {
        modelosGrandes.push(modelo);
      } else {
        modelosPequenos.push(modelo);
      }
    }

    const totalPequenasAgencia = modelosPequenos.reduce((acc, m) => acc + (modelosMap.get(m)?.cantidad || 0), 0);

    // Requerimiento de pequeñas: Acopios a cubrir (la cantidad reportada ya incluye la agencia)
    const reqPequenas = acopios > 0 ? acopios : totalPequenasAgencia;
    const totalPequenasOperativas = Math.min(totalPequenasAgencia, reqPequenas);

    // 1. PROCESAR MODELOS GRANDES (EXCEPCIÓN: Fijas en agencia al 100%, independientes de acopios)
    for (const modelo of modelosGrandes) {
      const data = modelosMap.get(modelo)!;
      const cantidadOperativa = data.cantidad; // Siempre todas las grandes están activas en agencia
      const regla = obtenerReglaParaModelo(modelo, reglas);
      const cantidadRequerida = cantidadOperativa * regla.consumibles_requeridos_por_equipo;

      const normModelo = normalizarModelo(modelo);
      const stockConsumibles = consumiblesAgencia.filter((c) => {
        const cNorm = normalizarModelo(c.modelo_relacionado);
        return cNorm.includes(normModelo) || normModelo.includes(cNorm);
      });

      const existenciaActual = stockConsumibles.reduce((acc, c) => acc + c.cantidad_disponible, 0);
      const cantidadAComprar = Math.max(0, cantidadRequerida - existenciaActual);
      const cantidadSobrante = Math.max(0, existenciaActual - cantidadRequerida);

      let estadoAlerta: "verde" | "amarillo" | "rojo" = "verde";
      if (cantidadAComprar > 0) {
        estadoAlerta = "rojo";
      } else if (existenciaActual === cantidadRequerida && cantidadRequerida > 0) {
        estadoAlerta = "amarillo";
      } else {
        estadoAlerta = "verde";
      }

      resultados.push({
        agenciaId: ag.id,
        agenciaNombre: ag.nombre,
        departamento: ag.departamento,
        acopiosAgencia: acopios,
        marca: data.marca,
        modeloImpresora: modelo,
        esGrande: true,
        cantidadImpresoras: cantidadOperativa,
        cantidadImpresorasTotal: data.cantidad,
        cantidadImpresorasOperativas: cantidadOperativa,
        tipoConsumible: regla.tipo_consumible,
        existenciaActual,
        cantidadRequerida,
        cantidadAComprar,
        cantidadSobrante,
        estadoAlerta,
      });
    }

    // 2. PROCESAR MODELOS PEQUEÑOS (Asignadas a acopios externos + 1 puesto local en sede)
    let pequenasAsignadasAcumuladas = 0;
    modelosPequenos.forEach((modelo, index) => {
      const data = modelosMap.get(modelo)!;
      let cantidadOperativa = data.cantidad;

      if (totalPequenasAgencia > 0) {
        if (index === modelosPequenos.length - 1) {
          cantidadOperativa = Math.max(0, totalPequenasOperativas - pequenasAsignadasAcumuladas);
        } else {
          cantidadOperativa = Math.round((data.cantidad / totalPequenasAgencia) * totalPequenasOperativas);
          pequenasAsignadasAcumuladas += cantidadOperativa;
        }
      }

      const regla = obtenerReglaParaModelo(modelo, reglas);
      const cantidadRequerida = cantidadOperativa * regla.consumibles_requeridos_por_equipo;

      const normModelo = normalizarModelo(modelo);
      const stockConsumibles = consumiblesAgencia.filter((c) => {
        const cNorm = normalizarModelo(c.modelo_relacionado);
        return cNorm.includes(normModelo) || normModelo.includes(cNorm);
      });

      const existenciaActual = stockConsumibles.reduce((acc, c) => acc + c.cantidad_disponible, 0);
      const cantidadAComprar = Math.max(0, cantidadRequerida - existenciaActual);
      const cantidadSobrante = Math.max(0, existenciaActual - cantidadRequerida);

      let estadoAlerta: "verde" | "amarillo" | "rojo" = "verde";
      if (cantidadAComprar > 0) {
        estadoAlerta = "rojo";
      } else if (existenciaActual === cantidadRequerida && cantidadRequerida > 0) {
        estadoAlerta = "amarillo";
      } else {
        estadoAlerta = "verde";
      }

      resultados.push({
        agenciaId: ag.id,
        agenciaNombre: ag.nombre,
        departamento: ag.departamento,
        acopiosAgencia: acopios,
        marca: data.marca,
        modeloImpresora: modelo,
        esGrande: false,
        cantidadImpresoras: cantidadOperativa,
        cantidadImpresorasTotal: data.cantidad,
        cantidadImpresorasOperativas: cantidadOperativa,
        tipoConsumible: regla.tipo_consumible,
        existenciaActual,
        cantidadRequerida,
        cantidadAComprar,
        cantidadSobrante,
        estadoAlerta,
      });
    });
  }

  return resultados;
}

/**
 * Calcula requerimientos de UPS por agencia considerando:
 * - Modelos grandes siempre activos al 100% (respaldo de alta potencia, normalmente 1500 VA).
 * - Modelos pequeños calculados para acopios + 1 de sede de agencia (normalmente 500-750 VA).
 */
export function calcularUPS(
  agencias: Agencia[],
  impresoras: Impresora[],
  upsList: Ups[],
  reglas: ReglaImpresora[]
): UpsCalculoItem[] {
  const resultados: UpsCalculoItem[] = [];

  for (const ag of agencias) {
    if (ag.estado !== "Activa") continue;

    const impresorasAgencia = impresoras.filter((imp) => imp.agencia_id === ag.id);
    const upsAgencia = upsList.filter((u) => u.agencia_id === ag.id && u.estado === "Operativo");
    const acopios = ag.cantidad_acopios || 0;

    const modelosMap = new Map<string, { marca: string; cantidad: number }>();
    for (const imp of impresorasAgencia) {
      const actual = modelosMap.get(imp.modelo) || { marca: imp.marca, cantidad: 0 };
      actual.cantidad += imp.cantidad;
      modelosMap.set(imp.modelo, actual);
    }

    const modelosGrandes: string[] = [];
    const modelosPequenos: string[] = [];

    for (const modelo of modelosMap.keys()) {
      const regla = obtenerReglaParaModelo(modelo, reglas);
      if (esImpresoraGrande(modelo, regla)) {
        modelosGrandes.push(modelo);
      } else {
        modelosPequenos.push(modelo);
      }
    }

    const totalPequenasAgencia = modelosPequenos.reduce((acc, m) => acc + (modelosMap.get(m)?.cantidad || 0), 0);
    const reqPequenas = acopios > 0 ? acopios : totalPequenasAgencia;
    const totalPequenasOperativas = Math.min(totalPequenasAgencia, reqPequenas);

    // 1. MODELOS GRANDES (100% activos en agencia siempre)
    for (const modelo of modelosGrandes) {
      const data = modelosMap.get(modelo)!;
      const cantidadOperativa = data.cantidad;
      const regla = obtenerReglaParaModelo(modelo, reglas);
      const va = regla.ups_requerida_va;
      const vaAlt = regla.ups_requerida_va_alt;

      const upsExistentes = upsAgencia
        .filter((u) => {
          if (u.capacidad_va === va) return true;
          if (vaAlt && u.capacidad_va === vaAlt) return true;
          return false;
        })
        .reduce((acc, u) => acc + u.cantidad, 0);

      const faltantes = Math.max(0, cantidadOperativa - upsExistentes);
      const sobrantes = Math.max(0, upsExistentes - cantidadOperativa);

      let estadoAlerta: "verde" | "amarillo" | "rojo" = "verde";
      if (faltantes > 0) {
        estadoAlerta = "rojo";
      } else if (sobrantes === 0 && cantidadOperativa > 0) {
        estadoAlerta = "amarillo";
      } else {
        estadoAlerta = "verde";
      }

      resultados.push({
        agenciaId: ag.id,
        agenciaNombre: ag.nombre,
        departamento: ag.departamento,
        acopiosAgencia: acopios,
        marcaImpresora: data.marca,
        modeloImpresora: modelo,
        esGrande: true,
        cantidadImpresoras: cantidadOperativa,
        cantidadImpresorasTotal: data.cantidad,
        cantidadImpresorasOperativas: cantidadOperativa,
        upsRequeridaVa: va,
        upsRequeridaVaAlt: vaAlt,
        upsExistentes,
        upsFaltantes: faltantes,
        upsSobrantes: sobrantes,
        estadoAlerta,
      });
    }

    // 2. MODELOS PEQUEÑOS (para acopios + 1 de sede)
    let pequenasAsignadasAcumuladas = 0;
    modelosPequenos.forEach((modelo, index) => {
      const data = modelosMap.get(modelo)!;
      let cantidadOperativa = data.cantidad;

      if (totalPequenasAgencia > 0) {
        if (index === modelosPequenos.length - 1) {
          cantidadOperativa = Math.max(0, totalPequenasOperativas - pequenasAsignadasAcumuladas);
        } else {
          cantidadOperativa = Math.round((data.cantidad / totalPequenasAgencia) * totalPequenasOperativas);
          pequenasAsignadasAcumuladas += cantidadOperativa;
        }
      }

      const regla = obtenerReglaParaModelo(modelo, reglas);
      const va = regla.ups_requerida_va;
      const vaAlt = regla.ups_requerida_va_alt;

      const upsExistentes = upsAgencia
        .filter((u) => {
          if (u.capacidad_va === va) return true;
          if (vaAlt && u.capacidad_va === vaAlt) return true;
          return false;
        })
        .reduce((acc, u) => acc + u.cantidad, 0);

      const faltantes = Math.max(0, cantidadOperativa - upsExistentes);
      const sobrantes = Math.max(0, upsExistentes - cantidadOperativa);

      let estadoAlerta: "verde" | "amarillo" | "rojo" = "verde";
      if (faltantes > 0) {
        estadoAlerta = "rojo";
      } else if (sobrantes === 0 && cantidadOperativa > 0) {
        estadoAlerta = "amarillo";
      } else {
        estadoAlerta = "verde";
      }

      resultados.push({
        agenciaId: ag.id,
        agenciaNombre: ag.nombre,
        departamento: ag.departamento,
        acopiosAgencia: acopios,
        marcaImpresora: data.marca,
        modeloImpresora: modelo,
        esGrande: false,
        cantidadImpresoras: cantidadOperativa,
        cantidadImpresorasTotal: data.cantidad,
        cantidadImpresorasOperativas: cantidadOperativa,
        upsRequeridaVa: va,
        upsRequeridaVaAlt: vaAlt,
        upsExistentes,
        upsFaltantes: faltantes,
        upsSobrantes: sobrantes,
        estadoAlerta,
      });
    });
  }

  return resultados;
}

/**
 * Genera la MATRIZ INTEGRAL DE ACOPIOS VS EQUIPAMIENTO
 * Relaciona:
 * - Acopios a abrir (externos + 1 propio de la agencia).
 * - Impresoras pequeñas para acopios vs Impresoras grandes fijas de agencia (IR1643, MF455, MF440, etc.).
 * - Tóner y tinta en stock vs Requerimiento operativo real.
 * - Respaldo UPS compatible en existencia.
 */
export function calcularMatrizAcopios(
  agencias: Agencia[],
  impresoras: Impresora[],
  consumibles: Consumible[],
  upsList: Ups[],
  calculoConsumibles: ConsumibleCalculoItem[],
  calculoUPS: UpsCalculoItem[],
  reglas: ReglaImpresora[] = []
): MatrizAcopioItem[] {
  const matriz: MatrizAcopioItem[] = [];

  for (const ag of agencias) {
    if (ag.estado !== "Activa") continue;

    const acopios = ag.cantidad_acopios || 0;
    const impresorasAgencia = impresoras.filter((i) => i.agencia_id === ag.id);
    const consumiblesAgencia = consumibles.filter((c) => c.agencia_id === ag.id);
    const upsAgencia = upsList.filter((u) => u.agencia_id === ag.id && u.estado === "Operativo");

    // Clasificar impresoras existentes en grandes (fijas de agencia) y pequeñas (acopios y sede)
    const impresorasGrandesExistentes = impresorasAgencia
      .filter((i) => {
        const regla = obtenerReglaParaModelo(i.modelo, reglas);
        return esImpresoraGrande(i.modelo, regla);
      })
      .reduce((acc, i) => acc + i.cantidad, 0);

    const impresorasPequenasExistentes = impresorasAgencia
      .filter((i) => {
        const regla = obtenerReglaParaModelo(i.modelo, reglas);
        return !esImpresoraGrande(i.modelo, regla);
      })
      .reduce((acc, i) => acc + i.cantidad, 0);

    const impresorasExistentes = impresorasGrandesExistentes + impresorasPequenasExistentes;

    // Requerimiento de acopios: La cantidad reportada de acopios ya incluye la agencia
    const impresorasPequenasRequeridas = acopios > 0 ? acopios : impresorasPequenasExistentes;

    // Requerimiento total de impresoras = pequeñas de acopios + grandes fijas de agencia
    const impresorasRequeridas = impresorasPequenasRequeridas + impresorasGrandesExistentes;

    // Faltantes y sobrantes de impresoras pequeñas para acopios
    const impresorasFaltantes = Math.max(0, impresorasPequenasRequeridas - impresorasPequenasExistentes);
    const impresorasSobrantes = Math.max(0, impresorasPequenasExistentes - impresorasPequenasRequeridas);

    // 2. Balance de Consumibles
    const itemsConsumible = calculoConsumibles.filter((c) => c.agenciaId === ag.id);
    const consumiblesRequeridos = itemsConsumible.reduce((acc, c) => acc + c.cantidadRequerida, 0);
    const consumiblesExistentes = consumiblesAgencia.reduce((acc, c) => acc + c.cantidad_disponible, 0);
    const consumiblesFaltantes = itemsConsumible.reduce((acc, c) => acc + c.cantidadAComprar, 0);
    const consumiblesSobrantes = itemsConsumible.reduce((acc, c) => acc + c.cantidadSobrante, 0);

    // 3. Balance de UPS
    const itemsUps = calculoUPS.filter((u) => u.agenciaId === ag.id);
    const upsRequeridas = itemsUps.reduce((acc, u) => acc + u.cantidadImpresorasOperativas, 0);
    const upsExistentes = upsAgencia.reduce((acc, u) => acc + u.cantidad, 0);
    const upsFaltantes = itemsUps.reduce((acc, u) => acc + u.upsFaltantes, 0);
    const upsSobrantes = itemsUps.reduce((acc, u) => acc + u.upsSobrantes, 0);

    // 4. Estado de Cobertura
    let estadoCobertura: "cubierto" | "al_limite" | "deficit" = "cubierto";
    let mensajeEstado = `Cobertura Total: Acopios cubiertos (${acopios} acopios).`;
    if (impresorasGrandesExistentes > 0) {
      mensajeEstado += ` Sede con ${impresorasGrandesExistentes} grande(s) fija(s) (IR/MF).`;
    }

    if (impresorasFaltantes > 0 || consumiblesFaltantes > 0 || upsFaltantes > 0) {
      estadoCobertura = "deficit";
      const faltas: string[] = [];
      if (impresorasFaltantes > 0) faltas.push(`${impresorasFaltantes} impresora(s) para acopio`);
      if (consumiblesFaltantes > 0) faltas.push(`${consumiblesFaltantes} consumible(s)`);
      if (upsFaltantes > 0) faltas.push(`${upsFaltantes} UPS`);
      mensajeEstado = `Déficit operativo: Requiere ${faltas.join(", ")}.`;
      if (impresorasGrandesExistentes > 0) {
        mensajeEstado += ` (Posee ${impresorasGrandesExistentes} grande(s) fija(s) en agencia).`;
      }
    } else if (impresorasSobrantes === 0 && consumiblesSobrantes === 0 && upsSobrantes === 0 && acopios > 0) {
      estadoCobertura = "al_limite";
      mensajeEstado = `Al Límite: Stock exacto para los ${acopios} acopios.`;
    }

    matriz.push({
      agenciaId: ag.id,
      agenciaNombre: ag.nombre,
      departamento: ag.departamento,
      acopiosAAbrir: acopios,
      acopiosTotales: acopios,
      impresorasExistentes,
      impresorasPequenasExistentes,
      impresorasPequenasRequeridas,
      impresorasGrandesExistentes,
      impresorasRequeridas,
      impresorasFaltantes,
      impresorasSobrantes,
      consumiblesExistentes,
      consumiblesRequeridos,
      consumiblesFaltantes,
      consumiblesSobrantes,
      upsExistentes,
      upsRequeridas,
      upsFaltantes,
      upsSobrantes,
      estadoCobertura,
      mensajeEstado,
    });
  }

  return matriz;
}

/**
 * Genera el reporte consolidado de compras:
 * Consumibles faltantes + UPS faltantes + Impresoras faltantes para acopios + Compras adicionales
 */
export function generarConsolidado(
  calculoConsumibles: ConsumibleCalculoItem[],
  calculoUPS: UpsCalculoItem[],
  matrizAcopios: MatrizAcopioItem[],
  comprasAdicionales: CompraAdicional[]
): ConsolidadoItem[] {
  const consolidado: ConsolidadoItem[] = [];

  // 1. Impresoras faltantes para acopios (si alguna agencia no tiene suficientes equipos para sus acopios)
  const totalImpresorasFaltantes = matrizAcopios.reduce((acc, m) => acc + m.impresorasFaltantes, 0);
  if (totalImpresorasFaltantes > 0) {
    consolidado.push({
      categoria: "Impresora",
      articulo: "Impresoras Operativas para Puntos de Acopio",
      cantidad: totalImpresorasFaltantes,
      unidad: "Equipos",
      prioridad: "Alta",
      observaciones: "Déficit de equipos físicos para habilitar puntos de acopio programados",
    });
  }

  // 2. Agrupar consumibles a comprar por tipo y modelo
  const consumiblesMap = new Map<string, { cantidad: number; tipo: string }>();
  for (const item of calculoConsumibles) {
    if (item.cantidadAComprar > 0) {
      const key = `${item.tipoConsumible} ${item.modeloImpresora}`;
      const actual = consumiblesMap.get(key) || { cantidad: 0, tipo: item.tipoConsumible };
      actual.cantidad += item.cantidadAComprar;
      consumiblesMap.set(key, actual);
    }
  }

  for (const [articulo, data] of consumiblesMap.entries()) {
    consolidado.push({
      categoria: "Consumible",
      articulo,
      cantidad: data.cantidad,
      unidad: data.tipo.toLowerCase().includes("tinta") ? "Paquetes" : "Unidades",
      prioridad: "Alta",
      observaciones: "Requerimiento exacto para cubrir los acopios activos",
    });
  }

  // 3. Agrupar UPS faltantes por capacidad VA
  const upsMap = new Map<number, number>();
  for (const item of calculoUPS) {
    if (item.upsFaltantes > 0) {
      const actual = upsMap.get(item.upsRequeridaVa) || 0;
      upsMap.set(item.upsRequeridaVa, actual + item.upsFaltantes);
    }
  }

  for (const [va, cantidad] of upsMap.entries()) {
    consolidado.push({
      categoria: "UPS",
      articulo: `UPS ${va} VA`,
      cantidad,
      unidad: "Unidades",
      prioridad: "Alta",
      observaciones: `Protección eléctrica 1 a 1 para impresoras activas de acopios (${va} VA)`,
    });
  }

  // 4. Compras Adicionales
  for (const compra of comprasAdicionales) {
    consolidado.push({
      categoria: "Compra Adicional",
      articulo: compra.descripcion,
      cantidad: compra.cantidad,
      unidad: "Unidades",
      prioridad: compra.prioridad,
      observaciones: compra.observaciones || "Compra adicional registrada",
    });
  }

  return consolidado;
}

/**
 * Calcula todas las métricas para el Dashboard principal
 */
export function calcularMetricasDashboard(
  agencias: Agencia[],
  impresoras: Impresora[],
  consumibles: Consumible[],
  upsList: Ups[],
  transferencias: Transferencia[],
  comprasAdicionales: CompraAdicional[],
  calculoConsumibles: ConsumibleCalculoItem[],
  calculoUPS: UpsCalculoItem[],
  matrizAcopios: MatrizAcopioItem[]
): DashboardMetrics {
  const agenciasActivas = agencias.filter((a) => a.estado === "Activa");
  const totalAgencias = agenciasActivas.length;
  const totalAcopios = agenciasActivas.reduce((acc, a) => acc + (a.cantidad_acopios || 0), 0);
  const totalImpresoras = impresoras.reduce((acc, i) => acc + i.cantidad, 0);
  const totalUps = upsList.reduce((acc, u) => acc + u.cantidad, 0);
  const totalConsumibles = consumibles.reduce((acc, c) => acc + c.cantidad_disponible, 0);
  const totalComprasAdicionales = comprasAdicionales.reduce((acc, c) => acc + c.cantidad, 0);
  const totalTransferencias = transferencias.length;

  const totalFaltanteConsumibles = calculoConsumibles.reduce((acc, c) => acc + c.cantidadAComprar, 0);
  const totalFaltanteUps = calculoUPS.reduce((acc, u) => acc + u.upsFaltantes, 0);
  const totalImpresorasFaltantesAcopios = matrizAcopios.reduce((acc, m) => acc + m.impresorasFaltantes, 0);

  const totalRequerimientoPendiente =
    totalFaltanteConsumibles + totalFaltanteUps + totalImpresorasFaltantesAcopios + totalComprasAdicionales;

  const ahorroPorTransferencias = transferencias.reduce((acc, t) => acc + t.cantidad, 0);

  const alertasCriticas =
    matrizAcopios.filter((m) => m.estadoCobertura === "deficit").length;

  const agenciasConDeficit = alertasCriticas;
  const agenciasListasAcopio = matrizAcopios.filter((m) => m.estadoCobertura !== "deficit").length;

  return {
    totalAgencias,
    totalAcopios,
    totalImpresoras,
    totalUps,
    totalConsumibles,
    totalComprasAdicionales,
    totalTransferencias,
    totalRequerimientoPendiente,
    totalImpresorasFaltantesAcopios,
    ahorroPorTransferencias,
    alertasCriticas,
    agenciasConDeficit,
    agenciasListasAcopio,
  };
}
