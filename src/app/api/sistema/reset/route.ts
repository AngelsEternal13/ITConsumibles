import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  agencias,
  impresoras,
  consumibles,
  ups,
  transferencias,
  comprasAdicionales,
  auditoria,
} from "@/db/schema";
import { seed } from "@/db/seed";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const accion = body?.accion || "limpiar";

    if (accion === "limpiar") {
      // Borrar datos de prueba para permitir digitación desde cero
      await db.delete(transferencias);
      await db.delete(consumibles);
      await db.delete(ups);
      await db.delete(impresoras);
      await db.delete(comprasAdicionales);
      await db.delete(agencias);

      await db.insert(auditoria).values({
        usuario: "admin@empresa.com",
        accion: "DELETE",
        tabla: "sistema",
        registro_id: "reset",
        valor_nuevo: JSON.stringify({ mensaje: "Base de datos limpiada para digitación en blanco" }),
      });

      return NextResponse.json({
        success: true,
        mensaje: "Base de datos vaciada con éxito. Ahora puedes digitar tus agencias y equipos uno a uno desde cero.",
      });
    } else if (accion === "resembrar") {
      // Re-cargar datos de prueba si el usuario lo desea
      await seed();
      return NextResponse.json({
        success: true,
        mensaje: "Datos de demostración cargados nuevamente con éxito.",
      });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("Error en reset:", error);
    return NextResponse.json({ error: "Error al reiniciar la base de datos" }, { status: 500 });
  }
}
