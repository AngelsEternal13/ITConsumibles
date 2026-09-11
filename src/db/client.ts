import { createClient as createWebClient } from "@libsql/client/web";
import { createClient as createNodeClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const rawUrl = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

// Determinar si es conexión remota a Turso o archivo local SQLite
const isRemote = Boolean(
  rawUrl && (rawUrl.startsWith("libsql://") || rawUrl.startsWith("https://"))
);

if (process.env.NODE_ENV === "production" && !isRemote) {
  console.warn(
    "⚠️ [Turso Client] ADVERTENCIA: TURSO_DATABASE_URL no está configurada o no es remota en producción. URL actual:",
    rawUrl || "VACÍA"
  );
}

// Para entornos Serverless (Netlify, Vercel, etc.) el cliente web usa fetch sobre HTTPS nativo
// evitando dependencias binarias en C++ o WebSockets crudos que fallan en Lambda.
export const client = isRemote
  ? createWebClient({
      url: rawUrl!.replace(/^libsql:\/\//, "https://"),
      authToken: authToken || undefined,
    })
  : createNodeClient({
      url: rawUrl || "file:local.db",
      authToken: authToken || undefined,
    });

export const db = drizzle(client, { schema });
