import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
     * Proteger todas las rutas excepto:
     * - /login (página de login)
     * - /api/auth (rutas de autenticación de NextAuth)
     * - /api/sistema/health (diagnóstico de estado de BD)
     * - Archivos estáticos e imágenes (_next/static, _next/image, favicon, svg, png, etc.)
     */
    "/((?!login|api/auth|api/sistema/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
