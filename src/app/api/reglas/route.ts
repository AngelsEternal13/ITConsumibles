import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { reglasImpresoras } from "@/db/schema";
import { eq } from "drizzle-orm";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const list = await db.select().from(reglasImpresoras).orderBy(reglasImpresoras.modelo_impresora);
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener reglas de impresoras" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const {
      modelo_impresora,
      tipo_consumible,
      consumibles_requeridos_por_equipo,
      ups_requerida_va,
      ups_requerida_va_alt,
    } = body;

    if (!modelo_impresora || !tipo_consumible) {
      return NextResponse.json({ error: "Modelo y tipo de consumible son obligatorios" }, { status: 400 });
    }

    const [nueva] = await db
      .insert(reglasImpresoras)
      .values({
        modelo_impresora: modelo_impresora.trim(),
        tipo_consumible: tipo_consumible.trim(),
        consumibles_requeridos_por_equipo: Number(consumibles_requeridos_por_equipo) || 2,
        ups_requerida_va: Number(ups_requerida_va) || 750,
        ups_requerida_va_alt: ups_requerida_va_alt ? Number(ups_requerida_va_alt) : null,
      })
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "CREATE",
      tabla: "reglas_impresoras",
      registro_id: nueva.id,
      valor_nuevo: nueva,
    });

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al registrar regla o modelo duplicado" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const {
      id,
      modelo_impresora,
      tipo_consumible,
      consumibles_requeridos_por_equipo,
      ups_requerida_va,
      ups_requerida_va_alt,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const [anterior] = await db.select().from(reglasImpresoras).where(eq(reglasImpresoras.id, id));
    if (!anterior) {
      return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });
    }

    const [actualizada] = await db
      .update(reglasImpresoras)
      .set({
        modelo_impresora: modelo_impresora !== undefined ? modelo_impresora.trim() : anterior.modelo_impresora,
        tipo_consumible: tipo_consumible !== undefined ? tipo_consumible.trim() : anterior.tipo_consumible,
        consumibles_requeridos_por_equipo:
          consumibles_requeridos_por_equipo !== undefined
            ? Number(consumibles_requeridos_por_equipo)
            : anterior.consumibles_requeridos_por_equipo,
        ups_requerida_va:
          ups_requerida_va !== undefined ? Number(ups_requerida_va) : anterior.ups_requerida_va,
        ups_requerida_va_alt:
          ups_requerida_va_alt !== undefined
            ? ups_requerida_va_alt ? Number(ups_requerida_va_alt) : null
            : anterior.ups_requerida_va_alt,
      })
      .where(eq(reglasImpresoras.id, id))
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "UPDATE",
      tabla: "reglas_impresoras",
      registro_id: id,
      valor_anterior: anterior,
      valor_nuevo: actualizada,
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar regla" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const [anterior] = await db.select().from(reglasImpresoras).where(eq(reglasImpresoras.id, id));
    if (!anterior) {
      return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });
    }

    await db.delete(reglasImpresoras).where(eq(reglasImpresoras.id, id));

    await registrarAuditoria({
      usuario,
      accion: "DELETE",
      tabla: "reglas_impresoras",
      registro_id: id,
      valor_anterior: anterior,
    });

    return NextResponse.json({ success: true, message: "Regla eliminada" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar regla" }, { status: 500 });
  }
}
