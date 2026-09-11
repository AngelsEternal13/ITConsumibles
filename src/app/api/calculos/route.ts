import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  agencias,
  impresoras,
  consumibles,
  ups,
  reglasImpresoras,
  transferencias,
  comprasAdicionales,
} from "@/db/schema";
import {
  calcularConsumibles,
  calcularUPS,
  calcularMatrizAcopios,
  generarConsolidado,
  calcularMetricasDashboard,
} from "@/lib/calculations";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const [
      agenciasData,
      impresorasData,
      consumiblesData,
      upsData,
      reglasData,
      transferenciasData,
      comprasData,
    ] = await Promise.all([
      db.select().from(agencias),
      db.select().from(impresoras),
      db.select().from(consumibles),
      db.select().from(ups),
      db.select().from(reglasImpresoras),
      db.select().from(transferencias).orderBy(desc(transferencias.fecha)),
      db.select().from(comprasAdicionales).orderBy(desc(comprasAdicionales.fecha_creacion)),
    ]);

    const calculoConsumibles = calcularConsumibles(
      agenciasData,
      impresorasData,
      consumiblesData,
      reglasData
    );

    const calculoUPS = calcularUPS(agenciasData, impresorasData, upsData, reglasData);

    const matrizAcopios = calcularMatrizAcopios(
      agenciasData,
      impresorasData,
      consumiblesData,
      upsData,
      calculoConsumibles,
      calculoUPS,
      reglasData
    );

    const consolidado = generarConsolidado(
      calculoConsumibles,
      calculoUPS,
      matrizAcopios,
      comprasData
    );

    const metricas = calcularMetricasDashboard(
      agenciasData,
      impresorasData,
      consumiblesData,
      upsData,
      transferenciasData,
      comprasData,
      calculoConsumibles,
      calculoUPS,
      matrizAcopios
    );

    return NextResponse.json({
      metricas,
      calculoConsumibles,
      calculoUPS,
      matrizAcopios,
      consolidado,
      agencias: agenciasData,
      impresoras: impresorasData,
      consumibles: consumiblesData,
      ups: upsData,
      reglas: reglasData,
      transferencias: transferenciasData,
      comprasAdicionales: comprasData,
    });
  } catch (error: any) {
    console.error("Error al calcular requerimientos:", error);
    return NextResponse.json(
      { error: "Error interno al calcular requerimientos", details: error?.message },
      { status: 500 }
    );
  }
}
