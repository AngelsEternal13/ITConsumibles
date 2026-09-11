"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Package,
  Zap,
  ShoppingCart,
  ArrowRightLeft,
  SlidersHorizontal,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatNumber } from "@/lib/utils";

type TabType = "consolidado" | "consumibles" | "ups" | "transferencias" | "compras";

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("consolidado");

  // Filtros avanzados
  const [filtroAgencia, setFiltroAgencia] = useState("todas");
  const [filtroModelo, setFiltroModelo] = useState("todos");
  const [filtroTipoConsumible, setFiltroTipoConsumible] = useState("todos");
  const [filtroCapacidadUps, setFiltroCapacidadUps] = useState("todos");
  const [filtroEstadoStock, setFiltroEstadoStock] = useState("todos"); // todos | con_faltante | ok
  const [busqueda, setBusqueda] = useState("");

  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reportes-data"],
    queryFn: async () => {
      const res = await fetch("/api/calculos");
      if (!res.ok) throw new Error("Error cargando cálculos");
      return res.json();
    },
  });

  const handleExportExcel = async () => {
    try {
      setDescargandoExcel(true);
      toast.info("Generando archivo Excel (5 hojas con formato ejecutivo)...");
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
      toast.success("Archivo Excel generado y descargado correctamente");
    } catch (error) {
      toast.error("Error al exportar archivo Excel");
    } finally {
      setDescargandoExcel(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setDescargandoPdf(true);
      toast.info("Generando reporte ejecutivo en PDF con tablas y firmas...");
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
      toast.success("Documento PDF descargado correctamente");
    } catch (error) {
      toast.error("Error al exportar reporte PDF");
    } finally {
      setDescargandoPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-14 bg-muted rounded-xl"></div>
        <div className="h-96 bg-muted rounded-xl"></div>
      </div>
    );
  }

  const {
    calculoConsumibles = [],
    calculoUPS = [],
    consolidado = [],
    agencias = [],
    transferencias = [],
    comprasAdicionales = [],
    reglas = [],
  } = data || {};

  // Mapear nombres de agencias para transferencias
  const agenciasMap = new Map<number, string>();
  agencias.forEach((a: any) => agenciasMap.set(a.id, a.nombre));

  // Modelos únicos para filtro
  const modelosDisponibles = Array.from(
    new Set(calculoConsumibles.map((c: any) => c.modeloImpresora))
  ).filter(Boolean) as string[];

  // Capacidades UPS para filtro
  const capacidadesUpsDisponibles = Array.from(
    new Set(calculoUPS.map((u: any) => u.upsRequeridaVa))
  ).sort((a: any, b: any) => a - b) as number[];

  // ==========================================
  // FILTRADO DE REPORTES
  // ==========================================
  const consumiblesFiltrados = calculoConsumibles.filter((c: any) => {
    const matchesAgencia = filtroAgencia === "todas" || String(c.agenciaId) === filtroAgencia;
    const matchesModelo = filtroModelo === "todos" || c.modeloImpresora === filtroModelo;
    const matchesTipo = filtroTipoConsumible === "todos" || c.tipoConsumible === filtroTipoConsumible;
    const matchesEstado =
      filtroEstadoStock === "todos" ||
      (filtroEstadoStock === "con_faltante" ? c.cantidadAComprar > 0 : c.cantidadAComprar === 0);
    const matchesSearch =
      c.agenciaNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.modeloImpresora.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.tipoConsumible.toLowerCase().includes(busqueda.toLowerCase());

    return matchesAgencia && matchesModelo && matchesTipo && matchesEstado && matchesSearch;
  });

  const upsFiltrados = calculoUPS.filter((u: any) => {
    const matchesAgencia = filtroAgencia === "todas" || String(u.agenciaId) === filtroAgencia;
    const matchesModelo = filtroModelo === "todos" || u.modeloImpresora === filtroModelo;
    const matchesCapacidad =
      filtroCapacidadUps === "todos" || String(u.upsRequeridaVa) === filtroCapacidadUps;
    const matchesEstado =
      filtroEstadoStock === "todos" ||
      (filtroEstadoStock === "con_faltante" ? u.upsFaltantes > 0 : u.upsFaltantes === 0);
    const matchesSearch =
      u.agenciaNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.modeloImpresora.toLowerCase().includes(busqueda.toLowerCase());

    return matchesAgencia && matchesModelo && matchesCapacidad && matchesEstado && matchesSearch;
  });

  const transferenciasFiltradas = transferencias.filter((t: any) => {
    const origen = agenciasMap.get(t.agencia_origen_id) || "";
    const destino = agenciasMap.get(t.agencia_destino_id) || "";
    const matchesAgencia =
      filtroAgencia === "todas" ||
      String(t.agencia_origen_id) === filtroAgencia ||
      String(t.agencia_destino_id) === filtroAgencia;
    const matchesSearch =
      t.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      origen.toLowerCase().includes(busqueda.toLowerCase()) ||
      destino.toLowerCase().includes(busqueda.toLowerCase());

    return matchesAgencia && matchesSearch;
  });

  const comprasFiltradas = comprasAdicionales.filter((c: any) => {
    return (
      c.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.observaciones && c.observaciones.toLowerCase().includes(busqueda.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header y Acciones de Exportación */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            Centro de Reportes y Requerimientos de Compra
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cálculo automatizado de faltantes de consumibles, UPS y consolidación para adquisición
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            disabled={descargandoExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-semibold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{descargandoExcel ? "Generando..." : "Exportar Excel (5 Hojas)"}</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={descargandoPdf}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-semibold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{descargandoPdf ? "Generando..." : "Exportar PDF Ejecutivo"}</span>
          </button>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("consolidado")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "consolidado"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>1. Requerimiento Consolidado de Compras</span>
          <span className="ml-1 px-2 py-0.2 rounded-full bg-primary/15 text-primary text-xs font-bold">
            {consolidado.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("consumibles")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "consumibles"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>2. Reporte de Consumibles</span>
          <span className="ml-1 px-2 py-0.2 rounded-full bg-rose-500/15 text-rose-600 text-xs font-bold">
            {calculoConsumibles.filter((c: any) => c.cantidadAComprar > 0).length} faltantes
          </span>
        </button>

        <button
          onClick={() => setActiveTab("ups")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "ups"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>3. Reporte de UPS</span>
          <span className="ml-1 px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-600 text-xs font-bold">
            {calculoUPS.filter((u: any) => u.upsFaltantes > 0).length} faltantes
          </span>
        </button>

        <button
          onClick={() => setActiveTab("compras")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "compras"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>4. Compras Adicionales</span>
        </button>

        <button
          onClick={() => setActiveTab("transferencias")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "transferencias"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>5. Transferencias Realizadas</span>
        </button>
      </div>

      {/* Barra de Filtros Avanzados */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtros Avanzados de Consulta</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Búsqueda rápida */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Búsqueda Global
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Filtrar texto..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Agencia */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Agencia
            </label>
            <select
              value={filtroAgencia}
              onChange={(e) => setFiltroAgencia(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-background rounded-md border border-border focus:outline-hidden"
            >
              <option value="todas">Todas las Agencias</option>
              {agencias.map((a: any) => (
                <option key={a.id} value={String(a.id)}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Modelo Impresora */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Modelo Impresora
            </label>
            <select
              value={filtroModelo}
              onChange={(e) => setFiltroModelo(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-background rounded-md border border-border focus:outline-hidden"
            >
              <option value="todos">Todos los Modelos</option>
              {modelosDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo Consumible o Capacidad */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Tipo Consumible / VA
            </label>
            <select
              value={activeTab === "ups" ? filtroCapacidadUps : filtroTipoConsumible}
              onChange={(e) =>
                activeTab === "ups"
                  ? setFiltroCapacidadUps(e.target.value)
                  : setFiltroTipoConsumible(e.target.value)
              }
              className="w-full px-2.5 py-1.5 text-xs bg-background rounded-md border border-border focus:outline-hidden"
            >
              {activeTab === "ups" ? (
                <>
                  <option value="todos">Todas las Capacidades</option>
                  {capacidadesUpsDisponibles.map((va) => (
                    <option key={va} value={String(va)}>
                      {va} VA
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="todos">Todos los Tipos</option>
                  <option value="Tinta">Tinta</option>
                  <option value="Tóner">Tóner</option>
                </>
              )}
            </select>
          </div>

          {/* Estado de Stock */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Estado del Stock
            </label>
            <select
              value={filtroEstadoStock}
              onChange={(e) => setFiltroEstadoStock(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-background rounded-md border border-border focus:outline-hidden"
            >
              <option value="todos">Todos los Estados</option>
              <option value="con_faltante">Solo Requieren Compra (Rojo)</option>
              <option value="ok">Completos / Suficientes</option>
            </select>
          </div>
        </div>
      </div>

      {/* CONTENIDO DE TAB 1: REQUERIMIENTO CONSOLIDADO DE COMPRAS */}
      {activeTab === "consolidado" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  Lista Consolidada para Orden de Compra Ejecutiva
                </h2>
                <p className="text-xs text-muted-foreground">
                  Suma global y unificada de Consumibles Faltantes + UPS Faltantes + Compras Adicionales
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground font-semibold">Total de ítems consolidados: </span>
                <span className="font-extrabold text-foreground">{consolidado.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-5 py-3">Categoría</th>
                    <th className="px-5 py-3">Artículo / Descripción Requerida</th>
                    <th className="px-5 py-3 text-right">Cantidad a Comprar</th>
                    <th className="px-5 py-3">Unidad</th>
                    <th className="px-5 py-3">Prioridad</th>
                    <th className="px-5 py-3">Justificación Operativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {consolidado.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                        No hay requerimientos de compra pendientes. Todo el stock se encuentra al nivel óptimo.
                      </td>
                    </tr>
                  ) : (
                    consolidado.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              item.categoria === "Consumible"
                                ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30"
                                : item.categoria === "UPS"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                                : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30"
                            }`}
                          >
                            {item.categoria}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-bold text-foreground">
                          {item.articulo}
                        </td>
                        <td className="px-5 py-3 text-right font-black font-mono text-base text-rose-600 dark:text-rose-400">
                          {formatNumber(item.cantidad)}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {item.unidad}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.prioridad === "Alta"
                                ? "bg-rose-500/15 text-rose-600"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {item.prioridad || "Alta"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground max-w-sm">
                          {item.observaciones}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO DE TAB 2: REPORTE DE CONSUMIBLES */}
      {activeTab === "consumibles" && (
        <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Agencia</th>
                  <th className="px-6 py-3.5">Modelo Impresora</th>
                  <th className="px-6 py-3.5 text-center">Cant. Impresoras</th>
                  <th className="px-6 py-3.5">Consumible</th>
                  <th className="px-5 py-3.5 text-center">Existencia Actual (Acopio)</th>
                  <th className="px-5 py-3.5 text-center">Cantidad Requerida</th>
                  <th className="px-5 py-3.5 text-right text-rose-600">Falta Comprar</th>
                  <th className="px-5 py-3.5 text-right text-emerald-600">Sobra (Superávit)</th>
                  <th className="px-5 py-3.5 text-center">Estado Alerta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {consumiblesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                      No hay registros de consumibles que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  consumiblesFiltrados.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground">{item.agenciaNombre}</div>
                        <div className="text-xs text-muted-foreground">{item.departamento}</div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">
                        {item.marca} {item.modeloImpresora}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold">
                        {item.cantidadImpresoras}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-muted">
                          {item.tipoConsumible}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-foreground">
                        {item.existenciaActual}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-foreground">
                        {item.cantidadRequerida}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-black text-sm">
                        {item.cantidadAComprar > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            {item.cantidadAComprar}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-black text-sm">
                        {item.cantidadSobrante > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{item.cantidadSobrante}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            item.estadoAlerta === "rojo"
                              ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                              : item.estadoAlerta === "amarillo"
                              ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.estadoAlerta === "rojo"
                                ? "bg-rose-600"
                                : item.estadoAlerta === "amarillo"
                                ? "bg-amber-600"
                                : "bg-emerald-600"
                            }`}
                          />
                          {item.estadoAlerta === "rojo"
                            ? "Requiere Compra"
                            : item.estadoAlerta === "amarillo"
                            ? "Al Límite"
                            : "Correcto"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO DE TAB 3: REPORTE DE UPS */}
      {activeTab === "ups" && (
        <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Agencia</th>
                  <th className="px-5 py-3.5">Modelo Impresora</th>
                  <th className="px-5 py-3.5 text-center">Cant. Impresoras</th>
                  <th className="px-5 py-3.5 text-center">UPS Requerida (VA)</th>
                  <th className="px-5 py-3.5 text-center">UPS Existentes</th>
                  <th className="px-5 py-3.5 text-right text-rose-600">Falta Comprar UPS</th>
                  <th className="px-5 py-3.5 text-right text-emerald-600">Sobran UPS</th>
                  <th className="px-5 py-3.5 text-center">Estado Alerta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                      No hay registros de UPS que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  upsFiltrados.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground">{item.agenciaNombre}</div>
                        <div className="text-xs text-muted-foreground">{item.departamento}</div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">
                        {item.marcaImpresora} {item.modeloImpresora}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold">
                        {item.cantidadImpresoras}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          {item.upsRequeridaVa} VA {item.upsRequeridaVaAlt ? `o ${item.upsRequeridaVaAlt} VA` : ""}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-foreground">
                        {item.upsExistentes}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-black text-sm">
                        {item.upsFaltantes > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            {item.upsFaltantes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-black text-sm">
                        {item.upsSobrantes > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{item.upsSobrantes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            item.estadoAlerta === "rojo"
                              ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                              : item.estadoAlerta === "amarillo"
                              ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.estadoAlerta === "rojo"
                                ? "bg-rose-600"
                                : item.estadoAlerta === "amarillo"
                                ? "bg-amber-600"
                                : "bg-emerald-600"
                            }`}
                          />
                          {item.estadoAlerta === "rojo"
                            ? "Falta UPS"
                            : item.estadoAlerta === "amarillo"
                            ? "Al Límite"
                            : "Protegido"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO DE TAB 4: COMPRAS ADICIONALES */}
      {activeTab === "compras" && (
        <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Descripción</th>
                  <th className="px-6 py-3.5 text-center">Cantidad</th>
                  <th className="px-6 py-3.5">Prioridad</th>
                  <th className="px-6 py-3.5">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comprasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No hay compras adicionales registradas.
                    </td>
                  </tr>
                ) : (
                  comprasFiltradas.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-foreground">
                        {c.descripcion}
                      </td>
                      <td className="px-6 py-3.5 text-center font-mono font-bold text-sm">
                        {c.cantidad}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            c.prioridad === "Alta"
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {c.prioridad}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">
                        {c.observaciones || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO DE TAB 5: TRANSFERENCIAS */}
      {activeTab === "transferencias" && (
        <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Fecha</th>
                  <th className="px-6 py-3.5">Origen</th>
                  <th className="px-6 py-3.5">Destino</th>
                  <th className="px-6 py-3.5">Artículo</th>
                  <th className="px-6 py-3.5 text-center">Cantidad</th>
                  <th className="px-6 py-3.5">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transferenciasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No hay transferencias registradas.
                    </td>
                  </tr>
                ) : (
                  transferenciasFiltradas.map((t: any) => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(t.fecha)}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-foreground">
                        {agenciasMap.get(t.agencia_origen_id) || `#${t.agencia_origen_id}`}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-foreground">
                        {agenciasMap.get(t.agencia_destino_id) || `#${t.agencia_destino_id}`}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-foreground">
                        {t.descripcion}
                      </td>
                      <td className="px-6 py-3.5 text-center font-mono font-bold text-emerald-600">
                        {t.cantidad}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">
                        {t.usuario}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
