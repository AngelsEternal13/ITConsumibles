import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { impresoras, agencias } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agenciaId = searchParams.get("agenciaId");

    const query = db
      .select({
        id: impresoras.id,
        agencia_id: impresoras.agencia_id,
        agencia_nombre: agencias.nombre,
        departamento: agencias.departamento,
        marca: impresoras.marca,
        modelo: impresoras.modelo,
        tipo_consumible: impresoras.tipo_consumible,
        cantidad: impresoras.cantidad,
        estado: impresoras.estado,
        observaciones: impresoras.observaciones,
        fecha_registro: impresoras.fecha_registro,
      })
      .from(impresoras)
      .leftJoin(agencias, eq(impresoras.agencia_id, agencias.id))
      .orderBy(desc(impresoras.fecha_registro));

    const list = await query;
    const filtered = agenciaId ? list.filter((i) => i.agencia_id === Number(agenciaId)) : list;
    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener impresoras" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const { agencia_id, marca, modelo, tipo_consumible, cantidad, estado, observaciones } = body;

    if (!agencia_id || !marca || !modelo) {
      return NextResponse.json({ error: "Agencia, marca y modelo son obligatorios" }, { status: 400 });
    }

    const [nueva] = await db
      .insert(impresoras)
      .values({
        agencia_id: Number(agencia_id),
        marca: marca.trim(),
        modelo: modelo.trim(),
        tipo_consumible: tipo_consumible || "Tóner",
        cantidad: Number(cantidad) || 1,
        estado: estado || "Operativa",
        observaciones: observaciones?.trim() || null,
      })
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "CREATE",
      tabla: "impresoras",
      registro_id: nueva.id,
      valor_nuevo: nueva,
    });

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al registrar impresora" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const { id, agencia_id, marca, modelo, tipo_consumible, cantidad, estado, observaciones } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const [anterior] = await db.select().from(impresoras).where(eq(impresoras.id, id));
    if (!anterior) {
      return NextResponse.json({ error: "Impresora no encontrada" }, { status: 404 });
    }

    const [actualizada] = await db
      .update(impresoras)
      .set({
        agencia_id: agencia_id !== undefined ? Number(agencia_id) : anterior.agencia_id,
        marca: marca !== undefined ? marca.trim() : anterior.marca,
        modelo: modelo !== undefined ? modelo.trim() : anterior.modelo,
        tipo_consumible: tipo_consumible !== undefined ? tipo_consumible : anterior.tipo_consumible,
        cantidad: cantidad !== undefined ? Number(cantidad) : anterior.cantidad,
        estado: estado !== undefined ? estado : anterior.estado,
        observaciones: observaciones !== undefined ? observaciones?.trim() || null : anterior.observaciones,
      })
      .where(eq(impresoras.id, id))
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "UPDATE",
      tabla: "impresoras",
      registro_id: id,
      valor_anterior: anterior,
      valor_nuevo: actualizada,
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar impresora" }, { status: 500 });
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

    const [anterior] = await db.select().from(impresoras).where(eq(impresoras.id, id));
    if (!anterior) {
      return NextResponse.json({ error: "Impresora no encontrada" }, { status: 404 });
    }

    await db.delete(impresoras).where(eq(impresoras.id, id));

    await registrarAuditoria({
      usuario,
      accion: "DELETE",
      tabla: "impresoras",
      registro_id: id,
      valor_anterior: anterior,
    });

    return NextResponse.json({ success: true, message: "Impresora eliminada" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar impresora" }, { status: 500 });
  }
}
