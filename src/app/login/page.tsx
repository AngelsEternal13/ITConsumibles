"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();

  const [usuarioOEmail, setUsuarioOEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioOEmail.trim() || !password) {
      toast.error("Por favor ingrese su usuario o correo y contraseña");
      return;
    }

    try {
      setLoading(true);
      const res = await signIn("credentials", {
        correo: usuarioOEmail.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Credenciales inválidas: verifique su usuario/correo y contraseña");
      } else {
        toast.success("Autenticación exitosa. Ingresando...");
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      toast.error("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white text-2xl font-bold shadow-lg shadow-primary/25 mb-3">
            M
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Portal de Gestión IT Central
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Control de Impresoras, Consumibles, UPS y Requerimientos de Compra
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-base font-bold text-foreground">Iniciar Sesión</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ingrese su usuario o correo electrónico y su contraseña para acceder.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Usuario o Correo Electrónico *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={usuarioOEmail}
                  onChange={(e) => setUsuarioOEmail(e.target.value)}
                  placeholder="Ingrese su usuario o correo"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-background rounded-lg border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Contraseña *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-background rounded-lg border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20 disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? "Iniciando sesión..." : "Ingresar al Sistema"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Acceso seguro protegido y auditado</span>
        </div>
      </div>
    </div>
  );
}
