import { NextResponse } from "next/server";
import { client, db } from "@/db/client";
import { agencias } from "@/db/schema";

export async function GET() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const hasToken = Boolean(process.env.TURSO_AUTH_TOKEN && process.env.TURSO_AUTH_TOKEN.length > 10);
  const nextAuthSecret = Boolean(process.env.NEXTAUTH_SECRET);
  const nextAuthUrl = process.env.NEXTAUTH_URL;

  try {
    const rawResult = await client.execute("SELECT 1 as ping;");
    const agenciasCount = await db.select().from(agencias);

    return NextResponse.json({
      status: "ok",
      tursoConectado: true,
      ping: rawResult.rows[0],
      totalAgenciasEnTurso: agenciasCount.length,
      config: {
        tursoUrlConfigurada: Boolean(tursoUrl),
        tursoUrlEsRemota: Boolean(tursoUrl && (tursoUrl.startsWith("libsql://") || tursoUrl.startsWith("https://"))),
        tursoAuthTokenPresente: hasToken,
        nextAuthSecretPresente: nextAuthSecret,
        nextAuthUrl: nextAuthUrl || "NO DEFINIDA (Netlify usará el header Host)",
      },
    });
  } catch (error: any) {
    console.error("[HealthCheck Error]:", error);
    return NextResponse.json(
      {
        status: "error",
        tursoConectado: false,
        errorName: error?.name || "Error",
        errorMessage: error?.message || String(error),
        config: {
          tursoUrlConfigurada: Boolean(tursoUrl),
          tursoUrlEsRemota: Boolean(tursoUrl && (tursoUrl.startsWith("libsql://") || tursoUrl.startsWith("https://"))),
          tursoAuthTokenPresente: hasToken,
          nextAuthSecretPresente: nextAuthSecret,
          nextAuthUrl: nextAuthUrl || "NO DEFINIDA",
        },
      },
      { status: 500 }
    );
  }
}
