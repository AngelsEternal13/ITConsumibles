import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { agencias } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const list = await db.select().from(agencias).orderBy(agencias.nombre);
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener agencias" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const { nombre, departamento, cantidad_acopios, estado } = body;

    if (!nombre) {
      return NextResponse.json({ error: "El nombre de la agencia es requerido" }, { status: 400 });
    }

    const [nueva] = await db
      .insert(agencias)
      .values({
        nombre: nombre.trim(),
        departamento: departamento?.trim() || "Principal",
        cantidad_acopios: Number(cantidad_acopios) || 0,
        estado: estado || "Activa",
      })
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "CREATE",
      tabla: "agencias",
      registro_id: nueva.id,
      valor_nuevo: nueva,
    });

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al registrar agencia" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const { id, nombre, departamento, cantidad_acopios, estado } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de agencia es requerido" }, { status: 400 });
    }

    const [anterior] = await db.select().from(agencias).where(eq(agencias.id, id));
    if (!anterior) {
      return NextResponse.json({ error: "Agencia no encontrada" }, { status: 400 });
    }

    const [actualizada] = await db
      .update(agencias)
      .set({
        nombre: nombre !== undefined ? nombre.trim() : anterior.nombre,
        departamento: departamento !== undefined ? departamento.trim() : anterior.departamento,
        cantidad_acopios: cantidad_acopios !== undefined ? Number(cantidad_acopios) : anterior.cantidad_acopios,
        estado: estado !== undefined ? estado : anterior.estado,
      })
      .where(eq(agencias.id, id))
      .returning();

    await registrarAuditoria({
      usuario,
      accion: "UPDATE",
      tabla: "agencias",
      registro_id: id,
      valor_anterior: anterior,
      valor_nuevo: actualizada,
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar agencia" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "ID de agencia requerido" }, { status: 400 });
    }

    const [anterior] = await db.select().from(agencias).where(eq(agencias.id, id));
    if (!anterior) {
      return NextResponse.json({ error: "Agencia no encontrada" }, { status: 404 });
    }

    await db.delete(agencias).where(eq(agencias.id, id));

    await registrarAuditoria({
      usuario,
      accion: "DELETE",
      tabla: "agencias",
      registro_id: id,
      valor_anterior: anterior,
    });

    return NextResponse.json({ success: true, message: "Agencia eliminada" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar agencia" }, { status: 500 });
  }
}
