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
  } catch (error: any) {
    console.error("Error al obtener transferencias:", error);
    return NextResponse.json({ error: "Error al obtener transferencias", details: error?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const usuario = session?.user?.email || session?.user?.name || "admin@empresa.com";

    const body = await req.json();
    const {
      agencia_origen_id,
      agencia_destino_id,
      tipo_articulo,
      articulo_id,
      descripcion,
      cantidad,
    } = body;

    const cant = Number(cantidad);
    const origenId = Number(agencia_origen_id);
    const destinoId = Number(agencia_destino_id);

    if (!origenId || !destinoId || !tipo_articulo || !cant || cant <= 0) {
      return NextResponse.json({ error: "Datos de transferencia incompletos o cantidad inválida" }, { status: 400 });
    }

    if (origenId === destinoId) {
      return NextResponse.json({ error: "La agencia de origen y destino no pueden ser la misma" }, { status: 400 });
    }

    let descripcionFinal = (descripcion || "").trim();
    const tipo = String(tipo_articulo).toLowerCase().trim();

    // =========================================================================
    // 1. TRANSFERENCIA DE CONSUMIBLES
    // =========================================================================
    if (tipo === "consumible") {
      const consumiblesOrigen = await db
        .select()
        .from(consumibles)
        .where(eq(consumibles.agencia_id, origenId));

      // Buscar por ID si se proveyó, o por modelo
      let itemOrigen = articulo_id
        ? consumiblesOrigen.find((c) => c.id === Number(articulo_id))
        : null;

      if (!itemOrigen) {
        const normDesc = normalizarModelo(descripcionFinal);
        itemOrigen = consumiblesOrigen.find((c) => {
          const norm = normalizarModelo(c.modelo_relacionado);
          return normDesc.includes(norm) || norm.includes(normDesc);
        });
      }

      if (!itemOrigen) {
        return NextResponse.json(
          { error: `No se encontró el consumible en la agencia de origen seleccionada.` },
          { status: 400 }
        );
      }

      if (itemOrigen.cantidad_disponible < cant) {
        return NextResponse.json(
          {
            error: `Stock insuficiente en origen para ${itemOrigen.modelo_relacionado}. Disponible: ${itemOrigen.cantidad_disponible}, solicitado: ${cant}`,
          },
          { status: 400 }
        );
      }

      descripcionFinal = `${itemOrigen.tipo_consumible} - ${itemOrigen.modelo_relacionado}`;

      // A) Restar en origen
      const nuevoStockOrigen = itemOrigen.cantidad_disponible - cant;
      await db
        .update(consumibles)
        .set({
          cantidad_disponible: nuevoStockOrigen,
          fecha_actualizacion: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(consumibles.id, itemOrigen.id));

      // B) Sumar en destino
      const consumiblesDestino = await db
        .select()
        .from(consumibles)
        .where(eq(consumibles.agencia_id, destinoId));

      const itemDestino = consumiblesDestino.find(
        (c) =>
          normalizarModelo(c.modelo_relacionado) === normalizarModelo(itemOrigen.modelo_relacionado)
      );

      if (itemDestino) {
        await db
          .update(consumibles)
          .set({
            cantidad_disponible: itemDestino.cantidad_disponible + cant,
            fecha_actualizacion: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(consumibles.id, itemDestino.id));
      } else {
        await db.insert(consumibles).values({
          agencia_id: destinoId,
          tipo_consumible: itemOrigen.tipo_consumible,
          modelo_relacionado: itemOrigen.modelo_relacionado,
          cantidad_disponible: cant,
          fecha_actualizacion: sql`CURRENT_TIMESTAMP`,
        });
      }

    // =========================================================================
    // 2. TRANSFERENCIA DE UPS
    // =========================================================================
    } else if (tipo === "ups") {
      const upsOrigen = await db.select().from(ups).where(eq(ups.agencia_id, origenId));

      let itemUpsOrigen = articulo_id
        ? upsOrigen.find((u) => u.id === Number(articulo_id))
        : null;

      if (!itemUpsOrigen) {
        const normDesc = normalizarModelo(descripcionFinal);
        itemUpsOrigen = upsOrigen.find(
          (u) =>
            normDesc.includes(normalizarModelo(u.modelo)) ||
            normDesc.includes(String(u.capacidad_va))
        );
      }

      if (!itemUpsOrigen) {
        return NextResponse.json(
          { error: `No se encontró la UPS en la agencia de origen seleccionada.` },
          { status: 400 }
        );
      }

      if (itemUpsOrigen.cantidad < cant) {
        return NextResponse.json(
          {
            error: `Cantidad insuficiente de UPS en origen. Disponible: ${itemUpsOrigen.cantidad}, solicitado: ${cant}`,
          },
          { status: 400 }
        );
      }

      descripcionFinal = `UPS ${itemUpsOrigen.marca} ${itemUpsOrigen.modelo} (${itemUpsOrigen.capacidad_va} VA)`;

      // A) Restar en origen
      if (itemUpsOrigen.cantidad === cant) {
        await db.delete(ups).where(eq(ups.id, itemUpsOrigen.id));
      } else {
        await db
          .update(ups)
          .set({ cantidad: itemUpsOrigen.cantidad - cant })
          .where(eq(ups.id, itemUpsOrigen.id));
      }

      // B) Sumar en destino
      const upsDestino = await db.select().from(ups).where(eq(ups.agencia_id, destinoId));
      const itemUpsDestino = upsDestino.find(
        (u) =>
          u.modelo.trim().toLowerCase() === itemUpsOrigen.modelo.trim().toLowerCase() &&
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

    // =========================================================================
    // 3. TRANSFERENCIA DE IMPRESORAS
    // =========================================================================
    } else if (tipo === "impresora") {
      const impOrigen = await db.select().from(impresoras).where(eq(impresoras.agencia_id, origenId));

      let itemImpOrigen = articulo_id
        ? impOrigen.find((i) => i.id === Number(articulo_id))
        : null;

      if (!itemImpOrigen) {
        const normDesc = normalizarModelo(descripcionFinal);
        itemImpOrigen = impOrigen.find((i) => normDesc.includes(normalizarModelo(i.modelo)));
      }

      if (!itemImpOrigen) {
        return NextResponse.json(
          { error: `No se encontró la impresora en la agencia de origen seleccionada.` },
          { status: 400 }
        );
      }

      if (itemImpOrigen.cantidad < cant) {
        return NextResponse.json(
          {
            error: `Cantidad insuficiente de impresoras en origen. Disponible: ${itemImpOrigen.cantidad}, solicitado: ${cant}`,
          },
          { status: 400 }
        );
      }

      descripcionFinal = `Impresora ${itemImpOrigen.marca} ${itemImpOrigen.modelo}`;

      // A) Restar en origen
      if (itemImpOrigen.cantidad === cant) {
        await db.delete(impresoras).where(eq(impresoras.id, itemImpOrigen.id));
      } else {
        await db
          .update(impresoras)
          .set({ cantidad: itemImpOrigen.cantidad - cant })
          .where(eq(impresoras.id, itemImpOrigen.id));
      }

      // B) Sumar en destino
      const impDestino = await db.select().from(impresoras).where(eq(impresoras.agencia_id, destinoId));
      const itemImpDestino = impDestino.find(
        (i) => i.modelo.trim().toLowerCase() === itemImpOrigen.modelo.trim().toLowerCase()
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
          tipo_consumible: itemImpOrigen.tipo_consumible,
          cantidad: cant,
          estado: itemImpOrigen.estado,
          observaciones: `Transferida desde agencia origen #${origenId}`,
        });
      }
    } else {
      return NextResponse.json({ error: "Tipo de artículo no válido" }, { status: 400 });
    }

    // 4. Registrar en historial de transferencias
    const [nuevaTransferencia] = await db
      .insert(transferencias)
      .values({
        agencia_origen_id: origenId,
        agencia_destino_id: destinoId,
        tipo_articulo: tipo,
        descripcion: descripcionFinal,
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

    return NextResponse.json(
      {
        ...nuevaTransferencia,
        message: `Transferencia realizada: se descontaron ${cant} unidad(es) del origen y se sumaron al destino.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al procesar transferencia:", error);
    return NextResponse.json({ error: "Error al procesar la transferencia", details: error?.message || String(error) }, { status: 500 });
  }
}
