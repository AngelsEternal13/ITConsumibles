import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditoria } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db
      .select()
      .from(auditoria)
      .orderBy(desc(auditoria.fecha))
      .limit(200);
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener registros de auditoría" }, { status: 500 });
  }
}
