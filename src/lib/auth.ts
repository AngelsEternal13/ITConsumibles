import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import { db } from "@/db/client";
import { usuarios } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            tenantId: process.env.AZURE_AD_TENANT_ID,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credenciales Corporativas",
      credentials: {
        correo: { label: "Usuario o Correo", type: "text", placeholder: "admin o usuario@empresa.com" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.correo || !credentials?.password) {
          throw new Error("Por favor ingrese su usuario y contraseña");
        }

        const identifier = credentials.correo.trim();
        const identifierLower = identifier.toLowerCase();

        let user = null;
        try {
          const userList = await db
            .select()
            .from(usuarios)
            .where(
              or(
                eq(usuarios.correo, identifierLower),
                eq(usuarios.usuario, identifier),
                eq(usuarios.usuario, identifierLower),
                eq(usuarios.nombre, identifier)
              )
            )
            .limit(1);
          user = userList[0];
        } catch (dbErr) {
          console.error("⚠️ [NextAuth DB Error]: Error al consultar usuarios en Turso:", dbErr);
        }

        if (!user) {
          // Credenciales fallback automáticas para modo demo y desarrollo rápido
          if (
            (identifierLower === "admin@empresa.com" || identifierLower === "admin") &&
            credentials.password === "admin123"
          ) {
            return {
              id: "1",
              name: "Administrador IT",
              email: "admin@empresa.com",
              role: "admin",
            };
          }
          if (
            (identifierLower === "lector@empresa.com" || identifierLower === "lector") &&
            credentials.password === "lector123"
          ) {
            return {
              id: "2",
              name: "Usuario Lector",
              email: "lector@empresa.com",
              role: "lector",
            };
          }
          throw new Error("Credenciales inválidas: usuario o contraseña incorrectos");
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!passwordMatch && credentials.password !== user.password) {
          throw new Error("Contraseña incorrecta");
        }

        return {
          id: String(user.id),
          name: user.nombre,
          email: user.correo,
          role: user.rol,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role || "lector";
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as unknown as { id: string; role: string }).id = token.id as string;
        (session.user as unknown as { id: string; role: string }).role = (token.role as string) || "lector";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "desarrollo-secreto-super-seguro-consumibles-2025",
};
