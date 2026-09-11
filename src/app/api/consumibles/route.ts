import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { consumibles, agencias } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agenciaId = searchParams.get("agenciaId");

    const query = db
      .select({
        id: consumibles.id,
        agencia_id: consumibles.agencia_id,
        impresora_id: consumibles.impresora_id,
        agencia_nombre: agencias.nombre,
        departamento: agencias.departamento,
        tipo_consumible: consumibles.tipo_consumible,
        modelo_relacionado: consumibles.modelo_relacionado,
        cantidad_disponible: consumibles.cantidad_disponible,
        fecha_actualizacion: consumibles.fecha_actualizacion,
      })
      .from(consumibles)
      .leftJoin(agencias, eq(consumibles.agencia_id, agencias.id))
      .orderBy(desc(consumibles.fecha_actualizacion));

    const list = await query;
    const filtered = agenciaId ? list.filter((c) => c.agencia_id === Number(agenciaId)) : list;
    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener consumibles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const { agencia_id, impresora_id, tipo_consumible, modelo_relacionado, cantidad_disponible } = body;

    if (!agencia_id || !tipo_consumible || !modelo_relacionado) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Verificar si ya existe este consumible en la agencia para sumarle o actualizarlo
    const existente = await db
      .select()
      .from(consumibles)
      .where(
        sql`${consumibles.agencia_id} = ${Number(agencia_id)} AND LOWER(${consumibles.modelo_relacionado}) = LOWER(${modelo_relacionado.trim()})`
      )
      .limit(1);

    if (existente.length > 0) {
      const itemExistente = existente[0];
      const nuevaCantidad = itemExistente.cantidad_disponible + (Number(cantidad_disponible) || 0);

      const [actualizado] = await db
        .update(consumibles)
        .set({
          impresora_id: impresora_id !== undefined ? (impresora_id ? Number(impresora_id) : null) : itemExistente.impresora_id,
          tipo_consumible: tipo_consumible.trim(),
          cantidad_disponible: nuevaCantidad,
          fecha_actualizacion: new Date().toISOString(),
        })
        .where(eq(consumibles.id, itemExistente.id))
        .returning();

      await registrarAuditoria({
        usuario,
        accion: "UPDATE",
        tabla: "consumibles",
        registro_id: itemExistente.id,
        valor_anterior: itemExistente,
        valor_nuevo: actualizado,
      });

      return NextResponse.json(actualizado);
    }

    const [nuevo] = await db
      .insert(consumibles)
      .values({
        agencia_id: Number(agencia_id),
        impresora_id: impresora_id ? Number(impresora_id) : null,
        tipo_consumible: tipo_consumible.trim(),
        modelo_relacionado: modelo_relacionado.trim(),
        cantidad_disponible: Number(cantidad_disponible) || 0,
      })
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "CREATE",
      tabla: "consumibles",
      registro_id: nuevo.id,
      valor_nuevo: nuevo,
    });

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al registrar consumible" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const { id, agencia_id, impresora_id, tipo_consumible, modelo_relacionado, cantidad_disponible } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const [anterior] = await db.select().from(consumibles).where(eq(consumibles.id, id));
    if (!anterior) {
      return NextResponse.json({ error: "Consumible no encontrado" }, { status: 404 });
    }

    const [actualizado] = await db
      .update(consumibles)
      .set({
        agencia_id: agencia_id !== undefined ? Number(agencia_id) : anterior.agencia_id,
        impresora_id: impresora_id !== undefined ? (impresora_id ? Number(impresora_id) : null) : anterior.impresora_id,
        tipo_consumible: tipo_consumible !== undefined ? tipo_consumible.trim() : anterior.tipo_consumible,
        modelo_relacionado: modelo_relacionado !== undefined ? modelo_relacionado.trim() : anterior.modelo_relacionado,
        cantidad_disponible: cantidad_disponible !== undefined ? Number(cantidad_disponible) : anterior.cantidad_disponible,
        fecha_actualizacion: new Date().toISOString(),
      })
      .where(eq(consumibles.id, id))
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "UPDATE",
      tabla: "consumibles",
      registro_id: id,
      valor_anterior: anterior,
      valor_nuevo: actualizado,
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar consumible" }, { status: 500 });
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

    const [anterior] = await db.select().from(consumibles).where(eq(consumibles.id, id));
    if (!anterior) {
      return NextResponse.json({ error: "Consumible no encontrado" }, { status: 404 });
    }

    await db.delete(consumibles).where(eq(consumibles.id, id));

    await registrarAuditoria({
      usuario,
      accion: "DELETE",
      tabla: "consumibles",
      registro_id: id,
      valor_anterior: anterior,
    });

    return NextResponse.json({ success: true, message: "Consumible eliminado" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar consumible" }, { status: 500 });
  }
}
