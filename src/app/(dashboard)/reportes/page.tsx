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
  Layers,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatNumber } from "@/lib/utils";
import { MatrizAcopioItem } from "@/lib/calculations";
import Link from "next/link";

type TabType = "matriz" | "consolidado" | "consumibles" | "ups" | "transferencias" | "compras";

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("matriz");

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
      toast.info("Generando archivo Excel (Matriz de Acopios + Consumibles + UPS + Transferencias + Consolidado)...");
      const res = await fetch("/api/export/excel");
      if (!res.ok) throw new Error("Error generando Excel");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Consumibles_UPS_Acopios_${new Date().toISOString().split("T")[0]}.xlsx`;
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
    matrizAcopios = [],
    consolidado = [],
    transferencias = [],
    comprasAdicionales = [],
    agencias = [],
  } = data || {};

  // Opciones dinámicas de filtros
  const agenciasDisponibles = agencias.map((a: any) => ({ id: a.id, nombre: a.nombre }));
  const modelosDisponibles = Array.from(new Set(calculoConsumibles.map((c: any) => c.modeloImpresora)));
  const capacidadesUpsDisponibles = Array.from(new Set(calculoUPS.map((u: any) => u.upsRequeridaVa)));

  // Filtrado de Matriz de Acopios
  const matrizFiltrada = (matrizAcopios as MatrizAcopioItem[]).filter((item) => {
    const matchAgencia = filtroAgencia === "todas" || String(item.agenciaId) === filtroAgencia;
    const matchEstado =
      filtroEstadoStock === "todos" ||
      (filtroEstadoStock === "con_faltante" && item.estadoCobertura === "deficit") ||
      (filtroEstadoStock === "ok" && item.estadoCobertura !== "deficit");
    const matchBusqueda =
      item.agenciaNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.departamento.toLowerCase().includes(busqueda.toLowerCase());
    return matchAgencia && matchEstado && matchBusqueda;
  });

  // Filtrado de Consumibles
  const consumiblesFiltrados = calculoConsumibles.filter((c: any) => {
    const matchAgencia = filtroAgencia === "todas" || String(c.agenciaId) === filtroAgencia;
    const matchModelo = filtroModelo === "todos" || c.modeloImpresora === filtroModelo;
    const matchTipo = filtroTipoConsumible === "todos" || c.tipoConsumible === filtroTipoConsumible;
    const matchEstado =
      filtroEstadoStock === "todos" ||
      (filtroEstadoStock === "con_faltante" && c.cantidadAComprar > 0) ||
      (filtroEstadoStock === "ok" && c.cantidadAComprar === 0);
    const matchBusqueda =
      c.agenciaNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.modeloImpresora.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.departamento.toLowerCase().includes(busqueda.toLowerCase());
    return matchAgencia && matchModelo && matchTipo && matchEstado && matchBusqueda;
  });

  // Filtrado de UPS
  const upsFiltrados = calculoUPS.filter((u: any) => {
    const matchAgencia = filtroAgencia === "todas" || String(u.agenciaId) === filtroAgencia;
    const matchCapacidad = filtroCapacidadUps === "todos" || String(u.upsRequeridaVa) === filtroCapacidadUps;
    const matchEstado =
      filtroEstadoStock === "todos" ||
      (filtroEstadoStock === "con_faltante" && u.upsFaltantes > 0) ||
      (filtroEstadoStock === "ok" && u.upsFaltantes === 0);
    const matchBusqueda =
      u.agenciaNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.modeloImpresora.toLowerCase().includes(busqueda.toLowerCase());
    return matchAgencia && matchCapacidad && matchEstado && matchBusqueda;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            Centro de Reportes y Requerimientos de Compra
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Balance operativo de acopios, requerimientos reales de consumibles, UPS y consolidación
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            disabled={descargandoExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-semibold shadow-xs transition-all disabled:opacity-60 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{descargandoExcel ? "Generando..." : "Exportar Excel"}</span>
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
          onClick={() => setActiveTab("matriz")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "matriz"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Matriz de Cobertura de Acopios</span>
          <span className="ml-1 px-2 py-0.2 rounded-full bg-primary/15 text-primary text-xs font-bold">
            {matrizAcopios.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("consolidado")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "consolidado"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>2. Requerimiento Consolidado de Compras</span>
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
          <span>3. Detalle de Consumibles</span>
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
          <span>4. Detalle de UPS</span>
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
          <span>5. Compras Adicionales</span>
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
          <span>6. Historial de Transferencias</span>
        </button>
      </div>

      {/* Barra de Filtros Avanzados */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtros Avanzados</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda rápida */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Búsqueda
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
              {agenciasDisponibles.map((a: any) => (
                <option key={a.id} value={String(a.id)}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Estado de Stock */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Estado de Cobertura
            </label>
            <select
              value={filtroEstadoStock}
              onChange={(e) => setFiltroEstadoStock(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-background rounded-md border border-border focus:outline-hidden"
            >
              <option value="todos">Todos los Estados</option>
              <option value="con_faltante">Con Déficit / Falta Compra</option>
              <option value="ok">Cobertura Total / OK</option>
            </select>
          </div>

          {/* Modelo (si aplica) */}
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
              {modelosDisponibles.map((m: any) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CONTENIDO TAB 1: MATRIZ DE COBERTURA DE ACOPIOS */}
      {activeTab === "matriz" && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Matriz de Cobertura Operativa: Acopios vs Equipamiento
              </h2>
              <p className="text-xs text-muted-foreground">
                Compara los acopios a abrir vs impresoras existentes vs stock de consumibles vs respaldo de UPS
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground font-semibold">Agencias evaluadas: </span>
              <span className="font-extrabold text-foreground">{matrizFiltrada.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-5 py-3">Agencia</th>
                  <th className="px-4 py-3 text-center bg-primary/5 text-primary font-bold">Acopios (+1 Sede)</th>
                  <th className="px-5 py-3 text-center">Impresoras en Stock</th>
                  <th className="px-5 py-3 text-center">Consumibles en Stock</th>
                  <th className="px-5 py-3 text-center">UPS en Existencia</th>
                  <th className="px-5 py-3 text-center">Estado de Cobertura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matrizFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-xs">
                      No hay registros que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  matrizFiltrada.map((item) => {
                    const impBadge =
                      item.impresorasFaltantes > 0
                        ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200"
                        : item.impresorasSobrantes > 0
                        ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200"
                        : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200";

                    const conBadge =
                      item.consumiblesFaltantes > 0
                        ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200"
                        : item.consumiblesSobrantes > 0
                        ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200"
                        : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200";

                    const upsBadge =
                      item.upsFaltantes > 0
                        ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200"
                        : item.upsSobrantes > 0
                        ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200"
                        : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200";

                    return (
                      <tr key={item.agenciaId} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-foreground">{item.agenciaNombre}</div>
                          <div className="text-xs text-muted-foreground">{item.departamento}</div>
                        </td>
                        <td className="px-4 py-3.5 text-center bg-primary/5">
                          <span className="font-black text-primary text-base block">{item.acopiosAAbrir}</span>
                          <span className="text-[10px] text-muted-foreground block">+1 en sede</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="font-bold text-foreground">
                            {item.impresorasExistentes} <span className="text-xs font-normal text-muted-foreground">/ {item.impresorasRequeridas} req.</span>
                          </div>
                          <span className={`inline-block mt-0.5 px-2 py-0.2 rounded text-2xs font-bold border ${impBadge}`}>
                            {item.impresorasFaltantes > 0 ? `Faltan ${item.impresorasFaltantes} acopio(s)` : item.impresorasSobrantes > 0 ? `Sobran ${item.impresorasSobrantes} (transf.)` : "Acopios Cubiertos"}
                          </span>
                          {item.impresorasGrandesExistentes && item.impresorasGrandesExistentes > 0 ? (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block mt-0.5 font-medium">
                              Incluye {item.impresorasGrandesExistentes} grande(s) fija(s)
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="font-bold text-foreground">
                            {item.consumiblesExistentes} <span className="text-xs font-normal text-muted-foreground">/ {item.consumiblesRequeridos} req.</span>
                          </div>
                          <span className={`inline-block mt-0.5 px-2 py-0.2 rounded text-2xs font-bold border ${conBadge}`}>
                            {item.consumiblesFaltantes > 0 ? `Faltan ${item.consumiblesFaltantes}` : item.consumiblesSobrantes > 0 ? `Sobran ${item.consumiblesSobrantes}` : "Stock OK"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="font-bold text-foreground">
                            {item.upsExistentes} <span className="text-xs font-normal text-muted-foreground">/ {item.upsRequeridas} req.</span>
                          </div>
                          <span className={`inline-block mt-0.5 px-2 py-0.2 rounded text-2xs font-bold border ${upsBadge}`}>
                            {item.upsFaltantes > 0 ? `Faltan ${item.upsFaltantes}` : item.upsSobrantes > 0 ? `Sobran ${item.upsSobrantes}` : "Protegido"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {item.estadoCobertura === "cubierto" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                              <CheckCircle2 className="w-3 h-3" /> Cubierta
                            </span>
                          ) : item.estadoCobertura === "al_limite" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-xs">
                              <AlertTriangle className="w-3 h-3" /> Al Límite
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs">
                              <ShieldAlert className="w-3 h-3" /> Déficit
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 2: REQUERIMIENTO CONSOLIDADO DE COMPRAS */}
      {activeTab === "consolidado" && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                Lista Consolidada para Orden de Compra Ejecutiva
              </h2>
              <p className="text-xs text-muted-foreground">
                Suma global de requerimientos estrictamente necesarios para cubrir la operación de los acopios
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground font-semibold">Total ítems: </span>
              <span className="font-extrabold text-foreground">{consolidado.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-5 py-3">Categoría</th>
                  <th className="px-5 py-3">Artículo Requerido</th>
                  <th className="px-5 py-3 text-center">Cantidad a Comprar</th>
                  <th className="px-5 py-3 text-center">Unidad</th>
                  <th className="px-5 py-3 text-center">Prioridad</th>
                  <th className="px-5 py-3">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {consolidado.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-xs">
                      No hay compras requeridas. Todo el parque operativo de acopios se encuentra cubierto.
                    </td>
                  </tr>
                ) : (
                  consolidado.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          item.categoria === "Consumible"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : item.categoria === "UPS"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : item.categoria === "Impresora"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}>
                          {item.categoria}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-foreground">{item.articulo}</td>
                      <td className="px-5 py-3 text-center font-black text-rose-600 dark:text-rose-400 text-base">
                        {item.cantidad}
                      </td>
                      <td className="px-5 py-3 text-center text-xs text-muted-foreground">{item.unidad}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                          item.prioridad === "Alta" ? "bg-rose-100 text-rose-800" : "bg-muted text-foreground"
                        }`}>
                          {item.prioridad || "Media"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{item.observaciones}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 3: DETALLE CONSUMIBLES */}
      {activeTab === "consumibles" && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-2xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-5 py-3">Agencia</th>
                  <th className="px-3 py-3 text-center">Acopios</th>
                  <th className="px-4 py-3">Modelo Impresora</th>
                  <th className="px-3 py-3 text-center">Tipo</th>
                  <th className="px-3 py-3 text-center">Stock Actual</th>
                  <th className="px-3 py-3 text-center">Requerido (Acopios)</th>
                  <th className="px-3 py-3 text-center">Falta Comprar</th>
                  <th className="px-3 py-3 text-center">Sobra en Stock</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {consumiblesFiltrados.map((c: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="px-5 py-3 font-semibold text-foreground">{c.agenciaNombre}</td>
                    <td className="px-3 py-3 text-center font-bold text-primary">{c.acopiosAgencia}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.modeloImpresora}</td>
                    <td className="px-3 py-3 text-center text-xs">{c.tipoConsumible}</td>
                    <td className="px-3 py-3 text-center font-medium">{c.existenciaActual}</td>
                    <td className="px-3 py-3 text-center font-medium">{c.cantidadRequerida}</td>
                    <td className="px-3 py-3 text-center font-black text-rose-600">{c.cantidadAComprar}</td>
                    <td className="px-3 py-3 text-center font-black text-emerald-600">{c.cantidadSobrante}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-2xs px-2 py-0.5 rounded-full font-bold ${
                        c.estadoAlerta === "verde"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.estadoAlerta === "amarillo"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {c.estadoAlerta === "verde" ? "OK" : c.estadoAlerta === "amarillo" ? "LÍMITE" : "DÉFICIT"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 4: DETALLE UPS */}
      {activeTab === "ups" && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-2xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-5 py-3">Agencia</th>
                  <th className="px-3 py-3 text-center">Acopios</th>
                  <th className="px-4 py-3">Modelo Impresora</th>
                  <th className="px-3 py-3 text-center">VA Requerida</th>
                  <th className="px-3 py-3 text-center">UPS Compatibles</th>
                  <th className="px-3 py-3 text-center">Falta Comprar</th>
                  <th className="px-3 py-3 text-center">Sobran en Stock</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upsFiltrados.map((u: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="px-5 py-3 font-semibold text-foreground">{u.agenciaNombre}</td>
                    <td className="px-3 py-3 text-center font-bold text-primary">{u.acopiosAgencia}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.modeloImpresora}</td>
                    <td className="px-3 py-3 text-center text-xs font-bold">{u.upsRequeridaVa} VA</td>
                    <td className="px-3 py-3 text-center font-medium">{u.upsExistentes}</td>
                    <td className="px-3 py-3 text-center font-black text-rose-600">{u.upsFaltantes}</td>
                    <td className="px-3 py-3 text-center font-black text-emerald-600">{u.upsSobrantes}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-2xs px-2 py-0.5 rounded-full font-bold ${
                        u.estadoAlerta === "verde"
                          ? "bg-emerald-100 text-emerald-800"
                          : u.estadoAlerta === "amarillo"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {u.estadoAlerta === "verde" ? "OK" : u.estadoAlerta === "amarillo" ? "EXACTO" : "DÉFICIT"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 5: COMPRAS ADICIONALES */}
      {activeTab === "compras" && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-2xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-5 py-3">Descripción</th>
                  <th className="px-5 py-3 text-center">Cantidad</th>
                  <th className="px-5 py-3 text-center">Prioridad</th>
                  <th className="px-5 py-3">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comprasAdicionales.map((c: any) => (
                  <tr key={c.id} className="hover:bg-muted/20">
                    <td className="px-5 py-3 font-semibold text-foreground">{c.descripcion}</td>
                    <td className="px-5 py-3 text-center font-bold text-foreground">{c.cantidad}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded bg-muted font-bold">{c.prioridad}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{c.observaciones || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 6: TRANSFERENCIAS */}
      {activeTab === "transferencias" && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-2xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Descripción</th>
                  <th className="px-5 py-3 text-center">Cantidad</th>
                  <th className="px-5 py-3">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transferencias.map((t: any) => (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(t.fecha)}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold capitalize">
                        {t.tipo_articulo}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{t.descripcion}</td>
                    <td className="px-5 py-3 text-center font-bold text-foreground">{t.cantidad}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{t.usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
