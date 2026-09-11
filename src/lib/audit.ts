import { db } from "@/db/client";
import { auditoria } from "@/db/schema";

export async function registrarAuditoria({
  usuario,
  accion,
  tabla,
  registro_id,
  valor_anterior,
  valor_nuevo,
}: {
  usuario: string;
  accion: "CREATE" | "UPDATE" | "DELETE" | "TRANSFER";
  tabla: string;
  registro_id?: string | number;
  valor_anterior?: unknown;
  valor_nuevo?: unknown;
}) {
  try {
    await db.insert(auditoria).values({
      usuario: usuario || "sistema@empresa.com",
      accion,
      tabla,
      registro_id: registro_id ? String(registro_id) : undefined,
      valor_anterior: valor_anterior ? JSON.stringify(valor_anterior) : null,
      valor_nuevo: valor_nuevo ? JSON.stringify(valor_nuevo) : null,
    });
  } catch (error) {
    console.error("Error al registrar auditoría:", error);
  }
}
