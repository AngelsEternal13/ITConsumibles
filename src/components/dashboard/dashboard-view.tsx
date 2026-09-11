"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Printer,
  Package,
  Zap,
  ShoppingCart,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Search,
  Filter,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";
import { MatrizAcopioItem } from "@/lib/calculations";

const COLORS = ["#0078D4", "#107C41", "#FF8C00", "#D13438", "#8764B8", "#00B7C3", "#004E8C", "#E3008C"];

export function DashboardView() {
  const [filtroMatriz, setFiltroMatriz] = useState<"todas" | "cubierto" | "al_limite" | "deficit">("todas");
  const [busquedaMatriz, setBusquedaMatriz] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const res = await fetch("/api/calculos");
      if (!res.ok) throw new Error("Error cargando métricas");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-lg"></div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-xl"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-card border border-destructive/20 rounded-xl">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-2" />
        <h3 className="text-lg font-bold">Error al sincronizar datos</h3>
        <p className="text-sm text-muted-foreground mb-4">No se pudo calcular el estado actual del inventario</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { metricas, calculoConsumibles, calculoUPS, matrizAcopios = [], agencias } = data;

  // Filtrado de la Matriz de Acopios
  const matrizFiltrada = (matrizAcopios as MatrizAcopioItem[]).filter((item) => {
    const matchEstado = filtroMatriz === "todas" || item.estadoCobertura === filtroMatriz;
    const matchBusqueda =
      item.agenciaNombre.toLowerCase().includes(busquedaMatriz.toLowerCase()) ||
      item.departamento.toLowerCase().includes(busquedaMatriz.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  // Datos para gráfico por agencia: Requerido vs Existencia de consumibles
  const agenciasChartData = agencias.map((ag: { id: number; nombre: string }) => {
    const itemsAgencia = calculoConsumibles.filter((c: { agenciaId: number }) => c.agenciaId === ag.id);
    const requeridos = itemsAgencia.reduce((acc: number, c: { cantidadRequerida: number }) => acc + c.cantidadRequerida, 0);
    const existencia = itemsAgencia.reduce((acc: number, c: { existenciaActual: number }) => acc + c.existenciaActual, 0);
    const comprar = itemsAgencia.reduce((acc: number, c: { cantidadAComprar: number }) => acc + c.cantidadAComprar, 0);

    return {
      nombre: ag.nombre,
      Requerido: requeridos,
      Existente: existencia,
      Faltante: comprar,
    };
  });

  // Datos para gráfico de déficit de UPS por capacidad VA
  const upsChartDataMap = new Map<string, number>();
  calculoUPS.forEach((u: { upsRequeridaVa: number; upsFaltantes: number }) => {
    const key = `${u.upsRequeridaVa} VA`;
    upsChartDataMap.set(key, (upsChartDataMap.get(key) || 0) + u.upsFaltantes);
  });
  const upsChartData = Array.from(upsChartDataMap.entries()).map(([capacidad, faltantes]) => ({
    name: capacidad,
    value: faltantes,
  }));

  // Filtro de alertas activas
  const consumiblesRojos = calculoConsumibles.filter((c: { estadoAlerta: string }) => c.estadoAlerta === "rojo");
  const upsRojos = calculoUPS.filter((u: { estadoAlerta: string }) => u.estadoAlerta === "rojo");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Panel Ejecutivo de Operaciones IT
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Balance operativo: Acopios a abrir vs Impresoras vs Consumibles vs Respaldo UPS
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/transferencias"
            className="flex items-center gap-2 px-3.5 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-sm font-semibold shadow-xs transition-all"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>+ Nueva Transferencia</span>
          </Link>
          <Link
            href="/reportes"
            className="flex items-center gap-2 px-3.5 py-2 border border-border hover:bg-muted text-foreground rounded-lg text-sm font-semibold transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Ver Reportes Consolidados</span>
          </Link>
        </div>
      </div>

      {/* Tarjetas Principales de KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {/* Total Acopios Programados */}
        <div className="bg-card p-5 rounded-xl border border-primary/20 bg-primary/5 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Acopios a Abrir
            </span>
            <div className="p-2 rounded-lg bg-primary/15 text-primary">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-foreground">{formatNumber(metricas.totalAcopios || 0)}</span>
            <span className="text-xs text-muted-foreground">
              en {metricas.totalAgencias} agencias
            </span>
          </div>
          <p className="text-2xs text-muted-foreground mt-1">1 acopio = 1 impresora pequeña</p>
        </div>

        {/* Impresoras en Stock vs Acopios */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Impresoras en Stock
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">{formatNumber(metricas.totalImpresoras)}</span>
            {metricas.totalImpresorasFaltantesAcopios > 0 ? (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                Faltan {metricas.totalImpresorasFaltantesAcopios}
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                Cubierto
              </span>
            )}
          </div>
          <p className="text-2xs text-muted-foreground mt-1">Pequeñas (acopios) + Grandes fijas</p>
        </div>

        {/* Total Consumibles */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tóner y Tinta en Stock
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">{formatNumber(metricas.totalConsumibles)}</span>
            <span className="text-xs text-muted-foreground">unidades</span>
          </div>
          <p className="text-2xs text-muted-foreground mt-1">Para acopios y sede</p>
        </div>

        {/* Total UPS */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              UPS en Existencia
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">{formatNumber(metricas.totalUps)}</span>
            <span className="text-xs text-muted-foreground">unidades</span>
          </div>
          <p className="text-2xs text-muted-foreground mt-1">Protección eléctrica compatible</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN ESTELAR: MATRIZ DE COBERTURA OPERATIVA (ACOPIOS VS EQUIPAMIENTO) */}
      {/* ========================================================================= */}
      <div className="bg-card border border-border rounded-xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Matriz de Cobertura Operativa: Acopios vs Equipamiento por Agencia
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compara directamente los acopios a abrir vs impresoras en stock (pequeñas y grandes fijas) vs tóner/tinta vs UPS
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filtrar agencia..."
                value={busquedaMatriz}
                onChange={(e) => setBusquedaMatriz(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary w-40 md:w-48"
              />
            </div>

            {/* Filtro por estado */}
            <div className="flex items-center bg-background rounded-md border border-border p-0.5 text-xs">
              <button
                onClick={() => setFiltroMatriz("todas")}
                className={`px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${filtroMatriz === "todas" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                Todas ({matrizAcopios.length})
              </button>
              <button
                onClick={() => setFiltroMatriz("cubierto")}
                className={`px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${filtroMatriz === "cubierto" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                Cubiertas
              </button>
              <button
                onClick={() => setFiltroMatriz("deficit")}
                className={`px-2.5 py-1 rounded cursor-pointer font-medium transition-colors ${filtroMatriz === "deficit" ? "bg-rose-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                Con Déficit
              </button>
            </div>
          </div>
        </div>

        {/* Tabla Matriz */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3.5">Agencia / Sucursal</th>
                <th className="px-4 py-3.5 text-center bg-primary/5 text-primary font-bold">Acopios a Abrir</th>
                <th className="px-5 py-3.5 text-center">Impresoras en Stock</th>
                <th className="px-5 py-3.5 text-center">Tóner / Tinta en Stock</th>
                <th className="px-5 py-3.5 text-center">UPS en Existencia</th>
                <th className="px-5 py-3.5 text-center">Estado de Cobertura</th>
                <th className="px-4 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {matrizFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground text-xs">
                    No se encontraron agencias con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                matrizFiltrada.map((item) => {
                  // Badges de comparación
                  const impStatusColor =
                    item.impresorasFaltantes > 0
                      ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                      : item.impresorasSobrantes > 0
                      ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900"
                      : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900";

                  const conStatusColor =
                    item.consumiblesFaltantes > 0
                      ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                      : item.consumiblesSobrantes > 0
                      ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900"
                      : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900";

                  const upsStatusColor =
                    item.upsFaltantes > 0
                      ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                      : item.upsSobrantes > 0
                      ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900"
                      : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900";

                  return (
                    <tr key={item.agenciaId} className="hover:bg-muted/20 transition-colors">
                      {/* Agencia */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground">{item.agenciaNombre}</div>
                        <div className="text-xs text-muted-foreground">{item.departamento}</div>
                      </td>

                      {/* Acopios */}
                      <td className="px-4 py-4 text-center bg-primary/5">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm">
                          {item.acopiosAAbrir}
                        </span>
                      </td>

                      {/* Impresoras vs Acopios */}
                      <td className="px-5 py-4 text-center">
                        <div className="font-bold text-foreground">
                          {item.impresorasExistentes} <span className="text-xs font-normal text-muted-foreground">/ {item.impresorasRequeridas} req.</span>
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-2xs font-bold border ${impStatusColor}`}>
                          {item.impresorasFaltantes > 0
                            ? `Faltan ${item.impresorasFaltantes} acopio(s)`
                            : item.impresorasSobrantes > 0
                            ? `Sobran ${item.impresorasSobrantes} (transf.)`
                            : "Acopios Cubiertos"}
                        </span>
                        {item.impresorasGrandesExistentes && item.impresorasGrandesExistentes > 0 ? (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block mt-0.5 font-medium">
                            Incluye {item.impresorasGrandesExistentes} grande(s) fija(s)
                          </span>
                        ) : null}
                      </td>

                      {/* Consumibles vs Requerimiento de Acopios */}
                      <td className="px-5 py-4 text-center">
                        <div className="font-bold text-foreground">
                          {item.consumiblesExistentes} <span className="text-xs font-normal text-muted-foreground">/ {item.consumiblesRequeridos} req.</span>
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-2xs font-bold border ${conStatusColor}`}>
                          {item.consumiblesFaltantes > 0
                            ? `Faltan ${item.consumiblesFaltantes}`
                            : item.consumiblesSobrantes > 0
                            ? `Sobran ${item.consumiblesSobrantes}`
                            : "Stock OK"}
                        </span>
                      </td>

                      {/* UPS vs Impresoras de Acopios */}
                      <td className="px-5 py-4 text-center">
                        <div className="font-bold text-foreground">
                          {item.upsExistentes} <span className="text-xs font-normal text-muted-foreground">/ {item.upsRequeridas} req.</span>
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-2xs font-bold border ${upsStatusColor}`}>
                          {item.upsFaltantes > 0
                            ? `Faltan ${item.upsFaltantes}`
                            : item.upsSobrantes > 0
                            ? `Sobran ${item.upsSobrantes}`
                            : "Protegido"}
                        </span>
                      </td>

                      {/* Estado General */}
                      <td className="px-5 py-4 text-center">
                        {item.estadoCobertura === "cubierto" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Cubierta
                          </span>
                        ) : item.estadoCobertura === "al_limite" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Al Límite
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Déficit
                          </span>
                        )}
                        <p className="text-2xs text-muted-foreground mt-1 max-w-xs mx-auto truncate" title={item.mensajeEstado}>
                          {item.mensajeEstado}
                        </p>
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <Link
                          href="/transferencias"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border hover:bg-muted text-foreground transition-colors"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-primary" />
                          <span>Transferir</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alertas y Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Requerimientos vs Existencia por Agencia */}
        <div className="lg:col-span-2 bg-card p-5 rounded-xl border border-border shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">
              Consumibles Requeridos para Acopios vs Stock Actual
            </h3>
            <p className="text-xs text-muted-foreground">
              Demanda calculada sobre los acopios activos de cada agencia vs inventario disponible
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agenciasChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="nombre" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: 8, fontSize: 12 }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Requerido" fill="#0078D4" radius={[4, 4, 0, 0]} name="Requerido (Acopios)" />
                <Bar dataKey="Existente" fill="#107C41" radius={[4, 4, 0, 0]} name="Stock Físico" />
                <Bar dataKey="Faltante" fill="#D13438" radius={[4, 4, 0, 0]} name="Falta Comprar" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Déficit de UPS por Capacidad VA */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-2xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">
              Déficit de UPS para Acopios por Capacidad (VA)
            </h3>
            <p className="text-xs text-muted-foreground">
              Distribución de unidades requeridas para respaldar los acopios
            </p>
          </div>
          <div className="h-60 w-full flex-1">
            {upsChartData.length === 0 || upsChartData.every((i) => i.value === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-xs font-semibold text-foreground">Respaldo UPS Completo</p>
                <p className="text-2xs">Todas las impresoras de acopios cuentan con UPS compatible.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={upsChartData.filter((i) => i.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {upsChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="pt-2 border-t border-border text-center">
            <span className="text-xs font-semibold text-muted-foreground">
              Total Déficit de UPS:{" "}
              <strong className="text-foreground">
                {upsChartData.reduce((acc, i) => acc + i.value, 0)} unidades
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
