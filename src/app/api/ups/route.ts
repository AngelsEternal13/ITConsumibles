import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { ups, agencias } from "@/db/schema";
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
        id: ups.id,
        agencia_id: ups.agencia_id,
        impresora_id: ups.impresora_id,
        agencia_nombre: agencias.nombre,
        departamento: agencias.departamento,
        marca: ups.marca,
        modelo: ups.modelo,
        capacidad_va: ups.capacidad_va,
        cantidad: ups.cantidad,
        estado: ups.estado,
        fecha_registro: ups.fecha_registro,
      })
      .from(ups)
      .leftJoin(agencias, eq(ups.agencia_id, agencias.id))
      .orderBy(desc(ups.fecha_registro));

    const list = await query;
    const filtered = agenciaId ? list.filter((u) => u.agencia_id === Number(agenciaId)) : list;
    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener UPS" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const { agencia_id, impresora_id, marca, modelo, capacidad_va, cantidad, estado } = body;

    if (!agencia_id || !marca || !modelo || !capacidad_va) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const [nueva] = await db
      .insert(ups)
      .values({
        agencia_id: Number(agencia_id),
        impresora_id: impresora_id ? Number(impresora_id) : null,
        marca: marca.trim(),
        modelo: modelo.trim(),
        capacidad_va: Number(capacidad_va),
        cantidad: Number(cantidad) || 1,
        estado: estado || "Operativo",
      })
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "CREATE",
      tabla: "ups",
      registro_id: nueva.id,
      valor_nuevo: nueva,
    });

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al registrar UPS" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const { id, agencia_id, impresora_id, marca, modelo, capacidad_va, cantidad, estado } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const [anterior] = await db.select().from(ups).where(eq(ups.id, id));
    if (!anterior) {
      return NextResponse.json({ error: "UPS no encontrada" }, { status: 404 });
    }

    const [actualizada] = await db
      .update(ups)
      .set({
        agencia_id: agencia_id !== undefined ? Number(agencia_id) : anterior.agencia_id,
        impresora_id: impresora_id !== undefined ? (impresora_id ? Number(impresora_id) : null) : anterior.impresora_id,
        marca: marca !== undefined ? marca.trim() : anterior.marca,
        modelo: modelo !== undefined ? modelo.trim() : anterior.modelo,
        capacidad_va: capacidad_va !== undefined ? Number(capacidad_va) : anterior.capacidad_va,
        cantidad: cantidad !== undefined ? Number(cantidad) : anterior.cantidad,
        estado: estado !== undefined ? estado : anterior.estado,
      })
      .where(eq(ups.id, id))
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "UPDATE",
      tabla: "ups",
      registro_id: id,
      valor_anterior: anterior,
      valor_nuevo: actualizada,
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar UPS" }, { status: 500 });
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

    const [anterior] = await db.select().from(ups).where(eq(ups.id, id));
    if (!anterior) {
      return NextResponse.json({ error: "UPS no encontrada" }, { status: 404 });
    }

    await db.delete(ups).where(eq(ups.id, id));

    await registrarAuditoria({
      usuario,
      accion: "DELETE",
      tabla: "ups",
      registro_id: id,
      valor_anterior: anterior,
    });

    return NextResponse.json({ success: true, message: "UPS eliminada" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar UPS" }, { status: 500 });
  }
}
