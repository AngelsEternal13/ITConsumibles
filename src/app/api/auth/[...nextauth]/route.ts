import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// En Netlify, process.env.URL contiene el dominio asignado (ej: https://ejemplo.netlify.app)
if (!process.env.NEXTAUTH_URL && process.env.URL) {
  process.env.NEXTAUTH_URL = process.env.URL;
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
