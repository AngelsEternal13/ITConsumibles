import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const rawUrl = (process.env.TURSO_DATABASE_URL || "").trim();
const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

if (!rawUrl) {
  console.error(
    "❌ [Turso] ERROR: TURSO_DATABASE_URL no está configurada en las variables de entorno."
  );
}

// Convertir libsql:// a https:// para peticiones HTTP estándar en entornos serverless
const url = rawUrl ? rawUrl.replace(/^libsql:\/\//, "https://") : "https://placeholder-turso.io";

export const client = createClient({
  url,
  authToken: authToken || undefined,
});

export const db = drizzle(client, { schema });
