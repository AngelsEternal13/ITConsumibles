import { Agencia, Impresora, Consumible, Ups, ReglaImpresora, CompraAdicional, Transferencia } from "@/db/schema";

export interface ConsumibleCalculoItem {
  agenciaId: number;
  agenciaNombre: string;
  departamento: string;
  marca: string;
  modeloImpresora: string;
  cantidadImpresoras: number;
  tipoConsumible: string;
  existenciaActual: number;
  cantidadRequerida: number;
  cantidadAComprar: number; // Falta comprar
  cantidadSobrante: number; // Sobra en stock
  estadoAlerta: "verde" | "amarillo" | "rojo"; // verde = stock suficiente/sobra, amarillo = al límite exacto, rojo = requiere compra
}

export interface UpsCalculoItem {
  agenciaId: number;
  agenciaNombre: string;
  departamento: string;
  marcaImpresora: string;
  modeloImpresora: string;
  cantidadImpresoras: number;
  upsRequeridaVa: number;
  upsRequeridaVaAlt?: number | null;
  upsExistentes: number;
  upsFaltantes: number; // Falta UPS
  upsSobrantes: number; // Sobran UPS
  estadoAlerta: "verde" | "amarillo" | "rojo";
}

export interface ConsolidadoItem {
  categoria: "Consumible" | "UPS" | "Compra Adicional";
  articulo: string;
  cantidad: number;
  unidad: string;
  prioridad?: string;
  observaciones?: string;
}

export interface DashboardMetrics {
  totalAgencias: number;
  totalImpresoras: number;
  totalUps: number;
  totalConsumibles: number;
  totalComprasAdicionales: number;
  totalTransferencias: number;
  totalRequerimientoPendiente: number; // Suma de consumibles faltantes + UPS faltantes + compras adicionales
  ahorroPorTransferencias: number; // Cantidad total de articulos reasignados sin comprar
  alertasCriticas: number;
  agenciasConDeficit: number;
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
    ups_requerida_va: esTinta ? 550 : 750,
    ups_requerida_va_alt: esTinta ? 750 : null,
  };
}

/**
 * Calcula requerimientos de consumibles por agencia y modelo
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

    // Agrupar impresoras por modelo en la agencia
    const modelosMap = new Map<string, { marca: string; cantidad: number }>();
    for (const imp of impresorasAgencia) {
      const key = imp.modelo;
      const actual = modelosMap.get(key) || { marca: imp.marca, cantidad: 0 };
      actual.cantidad += imp.cantidad;
      modelosMap.set(key, actual);
    }

    for (const [modelo, data] of modelosMap.entries()) {
      const regla = obtenerReglaParaModelo(modelo, reglas);
      const requeridosPorEquipo = regla.consumibles_requeridos_por_equipo;
      const cantidadRequerida = data.cantidad * requeridosPorEquipo;

      // Buscar consumible correspondiente en la agencia
      const normModelo = normalizarModelo(modelo);
      const stockConsumibles = consumiblesAgencia.filter((c) => {
        const cNorm = normalizarModelo(c.modelo_relacionado);
        return cNorm.includes(normModelo) || normModelo.includes(cNorm);
      });

      const existenciaActual = stockConsumibles.reduce((acc, c) => acc + c.cantidad_disponible, 0);
      const cantidadAComprar = Math.max(0, cantidadRequerida - existenciaActual); // Falta
      const cantidadSobrante = Math.max(0, existenciaActual - cantidadRequerida); // Sobra

      let estadoAlerta: "verde" | "amarillo" | "rojo" = "verde";
      if (cantidadAComprar > 0) {
        estadoAlerta = "rojo";
      } else if (existenciaActual === cantidadRequerida) {
        estadoAlerta = "amarillo";
      } else {
        estadoAlerta = "verde"; // Sobra stock o está con superávit
      }

      resultados.push({
        agenciaId: ag.id,
        agenciaNombre: ag.nombre,
        departamento: ag.departamento,
        marca: data.marca,
        modeloImpresora: modelo,
        cantidadImpresoras: data.cantidad,
        tipoConsumible: regla.tipo_consumible,
        existenciaActual,
        cantidadRequerida,
        cantidadAComprar,
        cantidadSobrante,
        estadoAlerta,
      });
    }
  }

  return resultados;
}

/**
 * Calcula requerimientos de UPS por agencia y capacidad requerida
 * Regla: 1 impresora = 1 UPS de la capacidad requerida
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

    // Agrupar por modelo de impresora
    const modelosMap = new Map<string, { marca: string; cantidad: number }>();
    for (const imp of impresorasAgencia) {
      const actual = modelosMap.get(imp.modelo) || { marca: imp.marca, cantidad: 0 };
      actual.cantidad += imp.cantidad;
      modelosMap.set(imp.modelo, actual);
    }

    // Para cada modelo, determinamos su VA requerida y alternativa compatible
    for (const [modelo, data] of modelosMap.entries()) {
      const regla = obtenerReglaParaModelo(modelo, reglas);
      const va = regla.ups_requerida_va;
      const vaAlt = regla.ups_requerida_va_alt;
      const cantidadImpresoras = data.cantidad;

      // UPS existentes en esta agencia compatibles con esta impresora (va principal o va alternativa o asignadas directamente)
      const upsExistentes = upsAgencia
        .filter((u) => {
          if (u.capacidad_va === va) return true;
          if (vaAlt && u.capacidad_va === vaAlt) return true;
          return false;
        })
        .reduce((acc, u) => acc + u.cantidad, 0);

      const faltantes = Math.max(0, cantidadImpresoras - upsExistentes); // Falta
      const sobrantes = Math.max(0, upsExistentes - cantidadImpresoras); // Sobra

      let estadoAlerta: "verde" | "amarillo" | "rojo" = "verde";
      if (faltantes > 0) {
        estadoAlerta = "rojo";
      } else if (sobrantes === 0) {
        estadoAlerta = "amarillo"; // Exacto 1 a 1
      } else {
        estadoAlerta = "verde"; // Sobran UPS
      }

      resultados.push({
        agenciaId: ag.id,
        agenciaNombre: ag.nombre,
        departamento: ag.departamento,
        marcaImpresora: data.marca,
        modeloImpresora: modelo,
        cantidadImpresoras,
        upsRequeridaVa: va,
        upsRequeridaVaAlt: vaAlt,
        upsExistentes,
        upsFaltantes: faltantes,
        upsSobrantes: sobrantes,
        estadoAlerta,
      });
    }
  }

  return resultados;
}

/**
 * Genera el reporte consolidado de compras:
 * Consumibles faltantes + UPS faltantes + Compras adicionales
 */
export function generarConsolidado(
  calculoConsumibles: ConsumibleCalculoItem[],
  calculoUPS: UpsCalculoItem[],
  comprasAdicionales: CompraAdicional[]
): ConsolidadoItem[] {
  const consolidado: ConsolidadoItem[] = [];

  // 1. Agrupar consumibles a comprar por tipo y modelo
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
      observaciones: "Requerimiento automático para cubrir stock operativo de impresoras",
    });
  }

  // 2. Agrupar UPS faltantes por capacidad VA
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
      observaciones: `Protección eléctrica 1 a 1 para equipos que requieren ${va} VA`,
    });
  }

  // 3. Compras Adicionales
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
  calculoUPS: UpsCalculoItem[]
): DashboardMetrics {
  const totalAgencias = agencias.filter((a) => a.estado === "Activa").length;
  const totalImpresoras = impresoras.reduce((acc, i) => acc + i.cantidad, 0);
  const totalUps = upsList.reduce((acc, u) => acc + u.cantidad, 0);
  const totalConsumibles = consumibles.reduce((acc, c) => acc + c.cantidad_disponible, 0);
  const totalComprasAdicionales = comprasAdicionales.reduce((acc, c) => acc + c.cantidad, 0);
  const totalTransferencias = transferencias.length;

  const totalFaltanteConsumibles = calculoConsumibles.reduce((acc, c) => acc + c.cantidadAComprar, 0);
  const totalFaltanteUps = calculoUPS.reduce((acc, u) => acc + u.upsFaltantes, 0);
  const totalRequerimientoPendiente = totalFaltanteConsumibles + totalFaltanteUps + totalComprasAdicionales;

  // Ahorro por transferencias: total de unidades transferidas entre agencias que evitaron compras nuevas
  const ahorroPorTransferencias = transferencias.reduce((acc, t) => acc + t.cantidad, 0);

  // Alertas críticas
  const alertasCriticas =
    calculoConsumibles.filter((c) => c.estadoAlerta === "rojo").length +
    calculoUPS.filter((u) => u.estadoAlerta === "rojo").length;

  const agenciasConDeficitSet = new Set<number>();
  calculoConsumibles.filter((c) => c.cantidadAComprar > 0).forEach((c) => agenciasConDeficitSet.add(c.agenciaId));
  calculoUPS.filter((u) => u.upsFaltantes > 0).forEach((u) => agenciasConDeficitSet.add(u.agenciaId));

  return {
    totalAgencias,
    totalImpresoras,
    totalUps,
    totalConsumibles,
    totalComprasAdicionales,
    totalTransferencias,
    totalRequerimientoPendiente,
    ahorroPorTransferencias,
    alertasCriticas,
    agenciasConDeficit: agenciasConDeficitSet.size,
  };
}
