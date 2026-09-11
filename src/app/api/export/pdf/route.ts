import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  agencias,
  impresoras,
  consumibles,
  ups,
  reglasImpresoras,
  comprasAdicionales,
} from "@/db/schema";
import {
  calcularConsumibles,
  calcularUPS,
  calcularMatrizAcopios,
  generarConsolidado,
} from "@/lib/calculations";
import { generarReportePDF } from "@/lib/export-pdf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const usuarioNombre = session?.user?.name || "Administrador del Sistema";

    const [
      agenciasData,
      impresorasData,
      consumiblesData,
      upsData,
      reglasData,
      comprasData,
    ] = await Promise.all([
      db.select().from(agencias),
      db.select().from(impresoras),
      db.select().from(consumibles),
      db.select().from(ups),
      db.select().from(reglasImpresoras),
      db.select().from(comprasAdicionales),
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

    const pdfBuffer = generarReportePDF({
      consumibles: calculoConsumibles,
      ups: calculoUPS,
      consolidado,
      usuarioNombre,
    });

    const filename = `Reporte_Ejecutivo_Requerimientos_${new Date().toISOString().split("T")[0]}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error: any) {
    console.error("Error generando PDF:", error);
    return NextResponse.json({ error: "Error al generar archivo PDF", details: error?.message }, { status: 500 });
  }
}
