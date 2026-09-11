"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Printer,
  Package,
  Zap,
  ShoppingCart,
  ArrowRightLeft,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
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

const COLORS = ["#0078D4", "#107C41", "#FF8C00", "#D13438", "#8764B8", "#00B7C3", "#004E8C", "#E3008C"];

export function DashboardView() {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-muted rounded-lg"></div>
          <div className="h-80 bg-muted rounded-lg"></div>
        </div>
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
          className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { metricas, calculoConsumibles, calculoUPS, consolidado, agencias } = data;

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
            Monitoreo en tiempo real de agencias, impresoras, stock y requerimientos automáticos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/agencias"
            className="flex items-center gap-2 px-3.5 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-sm font-semibold shadow-xs transition-all"
          >
            <Building2 className="w-4 h-4" />
            <span>+ Agregar Agencia</span>
          </Link>
          <Link
            href="/impresoras"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>+ Asignar Impresora</span>
          </Link>
          <Link
            href="/consumibles"
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-all"
          >
            <Package className="w-4 h-4" />
            <span>+ Cargar Stock Tóner</span>
          </Link>
          <Link
            href="/ups"
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>+ Registrar UPS</span>
          </Link>
        </div>
      </div>

      {/* Banner de Inicio / Carga de Datos si no hay agencias registradas */}
      {metricas.totalAgencias === 0 && (
        <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-emerald-600/10 border-2 border-dashed border-primary/40 rounded-2xl p-6 sm:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Base de Datos Conectada - Lista para registrar información
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              Comienza a registrar la información de tus agencias y equipos
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              La base de datos se encuentra limpia y lista para que ingreses los datos reales. 
              El flujo sugerido para empezar es:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <Link
                href="/agencias"
                className="p-4 rounded-xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-primary flex items-center justify-center font-bold text-sm mb-2 group-hover:scale-110 transition-transform">
                    1
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Crear Agencias</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registra el nombre de cada agencia o sucursal (ej. Central, Sucursal Norte).
                  </p>
                </div>
                <span className="text-xs font-bold text-primary mt-4 flex items-center gap-1">
                  Ir a Agencias &rarr;
                </span>
              </Link>

              <Link
                href="/agencias"
                className="p-4 rounded-xl bg-card border border-border shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm mb-2 group-hover:scale-110 transition-transform">
                    2
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Ficha y Diagnóstico</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    En la lista de agencias pulsa "Ficha y Diagnóstico" para agregar en una sola pantalla sus impresoras, tóneres y UPS.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 mt-4 flex items-center gap-1">
                  Usar Asistente Todo en Uno &rarr;
                </span>
              </Link>

              <Link
                href="/reportes"
                className="p-4 rounded-xl bg-card border border-border shadow-xs hover:border-amber-500/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm mb-2 group-hover:scale-110 transition-transform">
                    3
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Reporte Automático</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    El sistema calculará en tiempo real qué falta comprar y qué sobra para cada equipo.
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-600 mt-4 flex items-center gap-1">
                  Ver Requerimientos &rarr;
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}


      {/* Tarjetas Ejecutivas de KPIs (8 Métricas Solicitadas) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Agencias */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Agencias
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-primary">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-foreground">{formatNumber(metricas.totalAgencias)}</span>
            <span className="text-xs text-muted-foreground ml-2">activas</span>
          </div>
        </div>

        {/* Total Impresoras */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Impresoras
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-foreground">{formatNumber(metricas.totalImpresoras)}</span>
            <span className="text-xs text-muted-foreground ml-2">equipos</span>
          </div>
        </div>

        {/* Total UPS */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total UPS
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-foreground">{formatNumber(metricas.totalUps)}</span>
            <span className="text-xs text-muted-foreground ml-2">unidades</span>
          </div>
        </div>

        {/* Total Consumibles */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Consumibles
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-foreground">{formatNumber(metricas.totalConsumibles)}</span>
            <span className="text-xs text-muted-foreground ml-2">en inventario</span>
          </div>
        </div>

        {/* Total Compras Adicionales */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Compras Adicionales
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-foreground">{formatNumber(metricas.totalComprasAdicionales)}</span>
            <span className="text-xs text-muted-foreground ml-2">artículos</span>
          </div>
        </div>

        {/* Total Transferencias */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Transferencias
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-foreground">{formatNumber(metricas.totalTransferencias)}</span>
            <span className="text-xs text-muted-foreground ml-2">movimientos</span>
          </div>
        </div>

        {/* Total Requerimiento Pendiente (Crítico) */}
        <div className="bg-card p-5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Requerimiento Pendiente
            </span>
            <div className="p-2 rounded-lg bg-rose-500/15 text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
              {formatNumber(metricas.totalRequerimientoPendiente)}
            </span>
            <span className="text-xs font-medium text-rose-700 dark:text-rose-400 ml-2">
              por adquirir
            </span>
          </div>
        </div>

        {/* Ahorro por Transferencias */}
        <div className="bg-card p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Ahorro Transferencias
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {formatNumber(metricas.ahorroPorTransferencias)}
            </span>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 ml-2">
              unidades evitadas
            </span>
          </div>
        </div>
      </div>

      {/* Alertas Automáticas Inteligentes */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
            <h2 className="text-base font-bold text-foreground">
              Alertas Automáticas de Operación y Stock Crítico
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Verde: Correcto
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Amarillo: Al Límite
            </span>
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Rojo: Requiere Compra
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Alertas de Consumibles */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-rose-500" />
              Consumibles con Déficit Inmediato ({consumiblesRojos.length})
            </h3>
            {consumiblesRojos.length === 0 ? (
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Todos los consumibles cumplen con el stock mínimo requerido.</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {consumiblesRojos.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground">{item.agenciaNombre}</span>
                      <span className="text-muted-foreground"> • {item.tipoConsumible} {item.modeloImpresora}</span>
                      <div className="text-[11px] text-muted-foreground">
                        Stock: {item.existenciaActual} / Req: {item.cantidadRequerida}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[11px]">
                        Comprar {item.cantidadAComprar}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alertas de UPS */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              UPS Faltantes por Regla 1 a 1 ({upsRojos.length})
            </h3>
            {upsRojos.length === 0 ? (
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Todas las impresoras cuentan con su respectiva UPS de respaldo.</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {upsRojos.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground">{item.agenciaNombre}</span>
                      <span className="text-muted-foreground"> • {item.modeloImpresora} ({item.upsRequeridaVa} VA)</span>
                      <div className="text-[11px] text-muted-foreground">
                        UPS Existentes: {item.upsExistentes} / Equipos: {item.cantidadImpresoras}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[11px]">
                        Faltan {item.upsFaltantes}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos Ejecutivos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Requerimientos vs Existencia por Agencia */}
        <div className="lg:col-span-2 bg-card p-5 rounded-xl border border-border shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">
              Consumibles: Stock Actual vs Requerimiento por Agencia
            </h3>
            <p className="text-xs text-muted-foreground">
              Comparativa de existencias operativas contra la regla de consumibles requeridos
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
                <Bar dataKey="Requerido" fill="#0078D4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Existente" fill="#107C41" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Faltante" fill="#D13438" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Déficit de UPS por Capacidad VA */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-2xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground">
              Déficit de UPS por Capacidad (VA)
            </h3>
            <p className="text-xs text-muted-foreground">
              Distribución de unidades requeridas por potencia
            </p>
          </div>
          <div className="h-60 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={upsChartData}
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
          </div>
          <div className="pt-2 border-t border-border text-center">
            <span className="text-xs font-semibold text-muted-foreground">
              Total Faltante de UPS:{" "}
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
