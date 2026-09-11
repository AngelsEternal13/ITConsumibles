import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { comprasAdicionales } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const list = await db
      .select()
      .from(comprasAdicionales)
      .orderBy(desc(comprasAdicionales.fecha_creacion));
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener compras adicionales" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const { descripcion, cantidad, observaciones, prioridad } = body;

    if (!descripcion || !cantidad) {
      return NextResponse.json({ error: "Descripción y cantidad son requeridos" }, { status: 400 });
    }

    const [nueva] = await db
      .insert(comprasAdicionales)
      .values({
        descripcion: descripcion.trim(),
        cantidad: Number(cantidad),
        observaciones: observaciones?.trim() || null,
        prioridad: prioridad || "Media",
      })
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "CREATE",
      tabla: "compras_adicionales",
      registro_id: nueva.id,
      valor_nuevo: nueva,
    });

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al registrar compra adicional" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const { id, descripcion, cantidad, observaciones, prioridad } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const [anterior] = await db
      .select()
      .from(comprasAdicionales)
      .where(eq(comprasAdicionales.id, id));

    if (!anterior) {
      return NextResponse.json({ error: "Compra adicional no encontrada" }, { status: 404 });
    }

    const [actualizada] = await db
      .update(comprasAdicionales)
      .set({
        descripcion: descripcion !== undefined ? descripcion.trim() : anterior.descripcion,
        cantidad: cantidad !== undefined ? Number(cantidad) : anterior.cantidad,
        observaciones: observaciones !== undefined ? observaciones.trim() : anterior.observaciones,
        prioridad: prioridad !== undefined ? prioridad : anterior.prioridad,
      })
      .where(eq(comprasAdicionales.id, id))
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "UPDATE",
      tabla: "compras_adicionales",
      registro_id: id,
      valor_anterior: anterior,
      valor_nuevo: actualizada,
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar compra adicional" }, { status: 500 });
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

    const [anterior] = await db
      .select()
      .from(comprasAdicionales)
      .where(eq(comprasAdicionales.id, id));

    if (!anterior) {
      return NextResponse.json({ error: "Compra adicional no encontrada" }, { status: 404 });
    }

    await db.delete(comprasAdicionales).where(eq(comprasAdicionales.id, id));

    await registrarAuditoria({
      usuario,
      accion: "DELETE",
      tabla: "compras_adicionales",
      registro_id: id,
      valor_anterior: anterior,
    });

    return NextResponse.json({ success: true, message: "Compra adicional eliminada" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar compra adicional" }, { status: 500 });
  }
}
