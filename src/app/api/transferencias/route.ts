import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { transferencias, agencias, consumibles, ups, impresoras } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { registrarAuditoria } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizarModelo } from "@/lib/calculations";

export async function GET() {
  try {
    const list = await db.select().from(transferencias).orderBy(desc(transferencias.fecha));
    const allAgencias = await db.select().from(agencias);

    const agenciasMap = new Map<number, string>();
    allAgencias.forEach((a) => agenciasMap.set(a.id, a.nombre));

    const resultado = list.map((t) => ({
      ...t,
      origenNombre: agenciasMap.get(t.agencia_origen_id) || `Agencia #${t.agencia_origen_id}`,
      destinoNombre: agenciasMap.get(t.agencia_destino_id) || `Agencia #${t.agencia_destino_id}`,
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener transferencias" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || "admin@empresa.com";

    const body = await req.json();
    const {
      agencia_origen_id,
      agencia_destino_id,
      tipo_articulo,
      descripcion,
      cantidad,
    } = body;

    const cant = Number(cantidad);
    const origenId = Number(agencia_origen_id);
    const destinoId = Number(agencia_destino_id);

    if (!origenId || !destinoId || !tipo_articulo || !descripcion || !cant || cant <= 0) {
      return NextResponse.json({ error: "Datos de transferencia incompletos o cantidad inválida" }, { status: 400 });
    }

    if (origenId === destinoId) {
      return NextResponse.json({ error: "La agencia de origen y destino no pueden ser la misma" }, { status: 400 });
    }

    const normDesc = normalizarModelo(descripcion);

    // =========================================================================
    // Ajuste de stock según tipo_articulo: consumible | ups | impresora
    // =========================================================================
    if (tipo_articulo.toLowerCase() === "consumible") {
      // 1. Verificar existencia en origen
      const consumiblesOrigen = await db
        .select()
        .from(consumibles)
        .where(eq(consumibles.agencia_id, origenId));

      const itemOrigen = consumiblesOrigen.find((c) => {
        const norm = normalizarModelo(c.modelo_relacionado);
        return normDesc.includes(norm) || norm.includes(normDesc);
      });

      if (!itemOrigen || itemOrigen.cantidad_disponible < cant) {
        return NextResponse.json(
          {
            error: `Stock insuficiente en origen. Stock disponible: ${itemOrigen?.cantidad_disponible || 0}`,
          },
          { status: 400 }
        );
      }

      // 2. Descontar en origen
      await db
        .update(consumibles)
        .set({
          cantidad_disponible: itemOrigen.cantidad_disponible - cant,
          fecha_actualizacion: new Date().toISOString(),
        })
        .where(eq(consumibles.id, itemOrigen.id));

      // 3. Aumentar en destino
      const consumiblesDestino = await db
        .select()
        .from(consumibles)
        .where(eq(consumibles.agencia_id, destinoId));

      const itemDestino = consumiblesDestino.find((c) => {
        const norm = normalizarModelo(c.modelo_relacionado);
        return normDesc.includes(norm) || norm.includes(normDesc);
      });

      if (itemDestino) {
        await db
          .update(consumibles)
          .set({
            cantidad_disponible: itemDestino.cantidad_disponible + cant,
            fecha_actualizacion: new Date().toISOString(),
          })
          .where(eq(consumibles.id, itemDestino.id));
      } else {
        await db.insert(consumibles).values({
          agencia_id: destinoId,
          tipo_consumible: itemOrigen.tipo_consumible,
          modelo_relacionado: itemOrigen.modelo_relacionado,
          cantidad_disponible: cant,
        });
      }
    } else if (tipo_articulo.toLowerCase() === "ups") {
      // Verificar UPS en origen
      const upsOrigen = await db.select().from(ups).where(eq(ups.agencia_id, origenId));
      const itemUpsOrigen = upsOrigen.find(
        (u) =>
          normDesc.includes(normalizarModelo(u.modelo)) ||
          normDesc.includes(String(u.capacidad_va))
      );

      if (!itemUpsOrigen || itemUpsOrigen.cantidad < cant) {
        return NextResponse.json(
          {
            error: `Stock insuficiente de UPS en origen. Disponibles: ${itemUpsOrigen?.cantidad || 0}`,
          },
          { status: 400 }
        );
      }

      // Descontar en origen
      if (itemUpsOrigen.cantidad === cant) {
        await db.delete(ups).where(eq(ups.id, itemUpsOrigen.id));
      } else {
        await db
          .update(ups)
          .set({ cantidad: itemUpsOrigen.cantidad - cant })
          .where(eq(ups.id, itemUpsOrigen.id));
      }

      // Aumentar en destino
      const upsDestino = await db.select().from(ups).where(eq(ups.agencia_id, destinoId));
      const itemUpsDestino = upsDestino.find(
        (u) =>
          u.modelo.toLowerCase() === itemUpsOrigen.modelo.toLowerCase() &&
          u.capacidad_va === itemUpsOrigen.capacidad_va
      );

      if (itemUpsDestino) {
        await db
          .update(ups)
          .set({ cantidad: itemUpsDestino.cantidad + cant })
          .where(eq(ups.id, itemUpsDestino.id));
      } else {
        await db.insert(ups).values({
          agencia_id: destinoId,
          marca: itemUpsOrigen.marca,
          modelo: itemUpsOrigen.modelo,
          capacidad_va: itemUpsOrigen.capacidad_va,
          cantidad: cant,
          estado: "Operativo",
        });
      }
    } else if (tipo_articulo.toLowerCase() === "impresora") {
      const impOrigen = await db.select().from(impresoras).where(eq(impresoras.agencia_id, origenId));
      const itemImpOrigen = impOrigen.find((i) => normDesc.includes(normalizarModelo(i.modelo)));

      if (!itemImpOrigen || itemImpOrigen.cantidad < cant) {
        return NextResponse.json(
          {
            error: `Cantidad insuficiente de impresoras en origen. Disponibles: ${itemImpOrigen?.cantidad || 0}`,
          },
          { status: 400 }
        );
      }

      if (itemImpOrigen.cantidad === cant) {
        await db.delete(impresoras).where(eq(impresoras.id, itemImpOrigen.id));
      } else {
        await db
          .update(impresoras)
          .set({ cantidad: itemImpOrigen.cantidad - cant })
          .where(eq(impresoras.id, itemImpOrigen.id));
      }

      const impDestino = await db.select().from(impresoras).where(eq(impresoras.agencia_id, destinoId));
      const itemImpDestino = impDestino.find(
        (i) => i.modelo.toLowerCase() === itemImpOrigen.modelo.toLowerCase()
      );

      if (itemImpDestino) {
        await db
          .update(impresoras)
          .set({ cantidad: itemImpDestino.cantidad + cant })
          .where(eq(impresoras.id, itemImpDestino.id));
      } else {
        await db.insert(impresoras).values({
          agencia_id: destinoId,
          marca: itemImpOrigen.marca,
          modelo: itemImpOrigen.modelo,
          cantidad: cant,
          estado: itemImpOrigen.estado,
          observaciones: `Transferida desde agencia origen #${origenId}`,
        });
      }
    }

    // 4. Registrar la transferencia en historial
    const [nuevaTransferencia] = await db
      .insert(transferencias)
      .values({
        agencia_origen_id: origenId,
        agencia_destino_id: destinoId,
        tipo_articulo: tipo_articulo.toLowerCase(),
        descripcion: descripcion.trim(),
        cantidad: cant,
        usuario,
      })
      .returning();

    // 5. Registrar en auditoría
    await registrarAuditoria({
      usuario,
      accion: "TRANSFER",
      tabla: "transferencias",
      registro_id: nuevaTransferencia.id,
      valor_nuevo: nuevaTransferencia,
    });

    return NextResponse.json(nuevaTransferencia, { status: 201 });
  } catch (error) {
    console.error("Error al procesar transferencia:", error);
    return NextResponse.json({ error: "Error al procesar la transferencia" }, { status: 500 });
  }
}
