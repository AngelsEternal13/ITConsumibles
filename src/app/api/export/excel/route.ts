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
} from "@/lib/calculations";
import { generarLibroExcel } from "@/lib/export-excel";
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
      calculoUPS
    );

    const consolidado = generarConsolidado(
      calculoConsumibles,
      calculoUPS,
      matrizAcopios,
      comprasData
    );

    const agenciasMap = new Map<number, string>();
    agenciasData.forEach((a) => agenciasMap.set(a.id, a.nombre));

    const transferenciasConNombres = transferenciasData.map((t) => ({
      ...t,
      origenNombre: agenciasMap.get(t.agencia_origen_id),
      destinoNombre: agenciasMap.get(t.agencia_destino_id),
    }));

    const buffer = await generarLibroExcel({
      consumibles: calculoConsumibles,
      ups: calculoUPS,
      matrizAcopios,
      comprasAdicionales: comprasData,
      transferencias: transferenciasConNombres,
      consolidado,
    });

    const filename = `Reporte_Consumibles_UPS_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Error generando Excel:", error);
    return NextResponse.json({ error: "Error al generar archivo Excel", details: error?.message }, { status: 500 });
  }
}
