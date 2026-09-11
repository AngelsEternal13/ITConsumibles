"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import {
  FileSpreadsheet,
  FileText,
  User,
  LogOut,
  Shield,
  Eye,
  RefreshCw,
  Search,
  BellRing,
  Database,
  Trash2,
  CheckCircle2,
  Building2,
  Printer,
  Package,
  Zap,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";

export function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Search State
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Queries cached by TanStack Query
  const { data: agencias = [] } = useQuery<any[]>({
    queryKey: ["agencias"],
    queryFn: async () => {
      const res = await fetch("/api/agencias");
      return res.ok ? res.json() : [];
    },
  });

  const { data: impresoras = [] } = useQuery<any[]>({
    queryKey: ["impresoras"],
    queryFn: async () => {
      const res = await fetch("/api/impresoras");
      return res.ok ? res.json() : [];
    },
  });

  const { data: consumibles = [] } = useQuery<any[]>({
    queryKey: ["consumibles"],
    queryFn: async () => {
      const res = await fetch("/api/consumibles");
      return res.ok ? res.json() : [];
    },
  });

  const { data: upsList = [] } = useQuery<any[]>({
    queryKey: ["ups"],
    queryFn: async () => {
      const res = await fetch("/api/ups");
      return res.ok ? res.json() : [];
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cleanQuery = searchQuery.trim().toLowerCase();

  const matchingAgencias = cleanQuery
    ? agencias.filter((a: any) => a.nombre?.toLowerCase().includes(cleanQuery) || a.departamento?.toLowerCase().includes(cleanQuery)).slice(0, 3)
    : [];

  const matchingImpresoras = cleanQuery
    ? impresoras.filter((i: any) => i.modelo?.toLowerCase().includes(cleanQuery) || i.marca?.toLowerCase().includes(cleanQuery) || i.agencia_nombre?.toLowerCase().includes(cleanQuery)).slice(0, 3)
    : [];

  const matchingConsumibles = cleanQuery
    ? consumibles.filter((c: any) => c.modelo_relacionado?.toLowerCase().includes(cleanQuery) || c.tipo_consumible?.toLowerCase().includes(cleanQuery) || c.agencia_nombre?.toLowerCase().includes(cleanQuery)).slice(0, 3)
    : [];

  const matchingUps = cleanQuery
    ? upsList.filter((u: any) => u.modelo?.toLowerCase().includes(cleanQuery) || u.marca?.toLowerCase().includes(cleanQuery) || String(u.capacidad_va).includes(cleanQuery) || u.agencia_nombre?.toLowerCase().includes(cleanQuery)).slice(0, 3)
    : [];

  const totalMatches = matchingAgencias.length + matchingImpresoras.length + matchingConsumibles.length + matchingUps.length;

  const handleSelectResult = (path: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    router.push(path);
  };

  const role = session?.user?.role || "admin";
  const userName = session?.user?.name || "Administrador IT";
  const userEmail = session?.user?.email || "admin@empresa.com";

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      toast.info("Generando archivo Excel corporativo con 5 hojas...");
      const res = await fetch("/api/export/excel");
      if (!res.ok) throw new Error("Error generando Excel");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Consumibles_UPS_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Libro de Excel descargado con éxito");
    } catch (err) {
      toast.error("No se pudo descargar el archivo Excel");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      toast.info("Generando reporte ejecutivo en PDF...");
      const res = await fetch("/api/export/pdf");
      if (!res.ok) throw new Error("Error generando PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Ejecutivo_Requerimientos_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Reporte PDF descargado con éxito");
    } catch (err) {
      toast.error("No se pudo descargar el archivo PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleResetDatabase = async (accion: "limpiar" | "resembrar") => {
    try {
      setResetting(true);
      const res = await fetch("/api/sistema/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reiniciar");
      toast.success(data.mensaje);
      queryClient.invalidateQueries();
      setDbModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-card/90 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Real-time Global Search */}
        <div ref={searchContainerRef} className="relative w-72 sm:w-96">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) setIsSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsSearchOpen(false);
                } else if (e.key === "Enter") {
                  if (matchingAgencias.length > 0) {
                    handleSelectResult(`/agencias?q=${encodeURIComponent(matchingAgencias[0].nombre)}`);
                  } else if (matchingImpresoras.length > 0) {
                    handleSelectResult(`/impresoras?q=${encodeURIComponent(matchingImpresoras[0].modelo)}`);
                  } else if (matchingConsumibles.length > 0) {
                    handleSelectResult(`/consumibles?q=${encodeURIComponent(matchingConsumibles[0].modelo_relacionado)}`);
                  } else if (matchingUps.length > 0) {
                    handleSelectResult(`/ups?q=${encodeURIComponent(matchingUps[0].modelo || matchingUps[0].capacidad_va)}`);
                  }
                }
              }}
              placeholder="Buscar agencia, modelo, tóner, UPS..."
              className="w-full bg-muted/60 text-sm pl-9 pr-8 py-1.5 rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-background transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Floating Live Search Dropdown */}
          {isSearchOpen && cleanQuery.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-2xl p-2 z-50 max-h-96 overflow-y-auto space-y-2 backdrop-blur-md">
              {totalMatches === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No se encontraron coincidencias para <span className="font-semibold text-foreground">"{searchQuery}"</span>
                </div>
              ) : (
                <>
                  {matchingAgencias.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-primary" />
                        <span>Agencias ({matchingAgencias.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {matchingAgencias.map((ag: any) => (
                          <button
                            key={`ag-${ag.id}`}
                            onClick={() => handleSelectResult(`/agencias?q=${encodeURIComponent(ag.nombre)}`)}
                            className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted text-xs flex items-center justify-between group transition-colors cursor-pointer"
                          >
                            <span className="font-semibold text-foreground group-hover:text-primary">
                              {ag.nombre}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {ag.departamento || "Principal"} · {ag.cantidad_acopios || 0} acopios
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchingImpresoras.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Printer className="w-3 h-3 text-cyan-600" />
                        <span>Impresoras ({matchingImpresoras.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {matchingImpresoras.map((imp: any) => (
                          <button
                            key={`imp-${imp.id}`}
                            onClick={() => handleSelectResult(`/impresoras?q=${encodeURIComponent(imp.modelo)}`)}
                            className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted text-xs flex items-center justify-between group transition-colors cursor-pointer"
                          >
                            <span className="font-semibold text-foreground group-hover:text-primary">
                              {imp.marca} {imp.modelo}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {imp.agencia_nombre} · {imp.cantidad} eq. ({imp.tipo_consumible})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchingConsumibles.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-indigo-600" />
                        <span>Consumibles ({matchingConsumibles.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {matchingConsumibles.map((c: any) => (
                          <button
                            key={`c-${c.id}`}
                            onClick={() => handleSelectResult(`/consumibles?q=${encodeURIComponent(c.modelo_relacionado)}`)}
                            className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted text-xs flex items-center justify-between group transition-colors cursor-pointer"
                          >
                            <span className="font-semibold text-foreground group-hover:text-primary">
                              {c.tipo_consumible} para {c.modelo_relacionado}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Stock: {c.cantidad_disponible} en {c.agencia_nombre}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchingUps.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-600" />
                        <span>UPS ({matchingUps.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {matchingUps.map((u: any) => (
                          <button
                            key={`u-${u.id}`}
                            onClick={() => handleSelectResult(`/ups?q=${encodeURIComponent(u.modelo || String(u.capacidad_va))}`)}
                            className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted text-xs flex items-center justify-between group transition-colors cursor-pointer"
                          >
                            <span className="font-semibold text-foreground group-hover:text-primary">
                              {u.marca} {u.modelo} ({u.capacidad_va} VA)
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {u.agencia_nombre} · Cant: {u.cantidad}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Global Actions & User Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Global Exports */}
          <div className="flex items-center gap-2 border-r border-border pr-3">
            <button
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs disabled:opacity-60 cursor-pointer"
              title="Exportar reporte completo en Excel (5 hojas)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{exportingExcel ? "Generando..." : "Excel"}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs disabled:opacity-60 cursor-pointer"
              title="Exportar documento ejecutivo en PDF con firmas"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{exportingPdf ? "Generando..." : "PDF"}</span>
            </button>
          </div>

          {/* Database management button */}
          <button
            onClick={() => setDbModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
            title="Gestión de Base de Datos y Limpieza para Carga en Blanco"
          >
            <Database className="w-3.5 h-3.5 text-primary" />
            <span>Base de Datos</span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Card & Role */}
          <div className="flex items-center gap-3 pl-2">
            <div className="flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-foreground leading-tight">
                {userName}
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight truncate max-w-[150px]">
                {userEmail}
              </span>
            </div>

            <div
              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-2xs ${
                role === "admin"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
              }`}
              title={`Rol asignado: ${role === "admin" ? "Administrador (Control total)" : "Lector (Solo consulta)"}`}
            >
              {role === "admin" ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{role}</span>
            </div>

            {/* Quick Signout or switch */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Modal de Opciones de Base de Datos y Turso */}
      {dbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">
                  Gestión de Datos del Sistema
                </h2>
              </div>
              <button
                onClick={() => setDbModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Servidor de Datos:</span>
                <span className="font-bold text-foreground">Base de Datos Centralizada</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Estado de Conexión:</span>
                <span className="font-semibold text-emerald-600">En línea y Sincronizada</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Opciones de Carga de Datos
              </h3>

              {/* Botón Vaciar para empezar en blanco */}
              <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    Limpiar Todo y Empezar en Blanco
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Elimina los registros de ejemplo para que puedas digitar todas tus agencias, impresoras y consumibles uno a uno.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm("¿Deseas vaciar la base de datos para ingresar tus agencias y equipos reales uno a uno?")) {
                      handleResetDatabase("limpiar");
                    }
                  }}
                  disabled={resetting}
                  className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer disabled:opacity-60"
                >
                  {resetting ? "Limpiando..." : "Vaciar Datos"}
                </button>
              </div>

              {/* Botón Restaurar Demo */}
              <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Cargar Datos de Demostración
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Re-puebla agencias de prueba con impresoras, consumibles y UPS para verificar reportes y fórmulas.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm("¿Deseas cargar nuevamente los datos de ejemplo iniciales?")) {
                      handleResetDatabase("resembrar");
                    }
                  }}
                  disabled={resetting}
                  className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-600 text-white font-bold text-xs shrink-0 cursor-pointer disabled:opacity-60"
                >
                  {resetting ? "Cargando..." : "Cargar Demo"}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setDbModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
