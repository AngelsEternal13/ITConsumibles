"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Printer,
  Package,
  Zap,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatNumber } from "@/lib/utils";

interface FichaAgenciaModalProps {
  agenciaId: number;
  onClose: () => void;
  esAdmin: boolean;
}

export function FichaAgenciaModal({
  agenciaId,
  onClose,
  esAdmin,
}: FichaAgenciaModalProps) {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"diagnostico" | "impresoras" | "consumibles" | "ups">("diagnostico");

  // Form states para agregar rápido
  const [nuevaMarca, setNuevaMarca] = useState("Epson");
  const [nuevoModelo, setNuevoModelo] = useState("");
  const [nuevaTipoConsumible, setNuevaTipoConsumible] = useState("Tóner");
  const [nuevaCantidadImp, setNuevaCantidadImp] = useState(1);

  const [tipoConsumible, setTipoConsumible] = useState("Tóner");
  const [modeloConsumible, setModeloConsumible] = useState("");
  const [cantidadConsumible, setCantidadConsumible] = useState(1);

  const [marcaUps, setMarcaUps] = useState("Forza");
  const [modeloUps, setModeloUps] = useState("");
  const [capacidadUps, setCapacidadUps] = useState(750);
  const [cantidadUps, setCantidadUps] = useState(1);

  // Cargar datos de cálculo centralizado
  const { data, isLoading } = useQuery({
    queryKey: ["calculos-central"],
    queryFn: async () => {
      const res = await fetch("/api/calculos");
      if (!res.ok) throw new Error("Error obteniendo cálculos");
      return res.json();
    },
  });

  const {
    agencias = [],
    impresoras = [],
    consumibles = [],
    ups = [],
    reglas = [],
    calculoConsumibles = [],
    calculoUPS = [],
  } = data || {};

  const agenciaActual = agencias.find((a: any) => a.id === agenciaId);

  // Filtrar para la agencia actual
  const impresorasAgencia = impresoras.filter((i: any) => i.agencia_id === agenciaId);
  const consumiblesAgencia = consumibles.filter((c: any) => c.agencia_id === agenciaId);
  const upsAgencia = ups.filter((u: any) => u.agencia_id === agenciaId);

  const diagnosticoConsumibles = calculoConsumibles.filter((c: any) => c.agenciaId === agenciaId);
  const diagnosticoUps = calculoUPS.filter((u: any) => u.agenciaId === agenciaId);

  // Mutaciones
  const addImpresora = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/impresoras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencia_id: agenciaId,
          marca: nuevaMarca,
          modelo: nuevoModelo.trim(),
          tipo_consumible: nuevaTipoConsumible,
          cantidad: Number(nuevaCantidadImp),
          estado: "Operativa",
        }),
      });
      if (!res.ok) throw new Error("Error al guardar impresora");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Impresora agregada a la agencia");
      setNuevoModelo("");
      queryClient.invalidateQueries({ queryKey: ["calculos-central"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["impresoras"] });
    },
    onError: () => toast.error("Error al registrar impresora"),
  });

  const addConsumible = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/consumibles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencia_id: agenciaId,
          tipo_consumible: tipoConsumible,
          modelo_relacionado: modeloConsumible.trim(),
          cantidad_disponible: Number(cantidadConsumible),
        }),
      });
      if (!res.ok) throw new Error("Error al guardar stock");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Stock de consumible actualizado");
      setModeloConsumible("");
      queryClient.invalidateQueries({ queryKey: ["calculos-central"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["consumibles"] });
    },
    onError: () => toast.error("Error al actualizar consumible"),
  });

  const addUps = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencia_id: agenciaId,
          marca: marcaUps,
          modelo: modeloUps.trim(),
          capacidad_va: Number(capacidadUps),
          cantidad: Number(cantidadUps),
          estado: "Operativo",
        }),
      });
      if (!res.ok) throw new Error("Error al guardar UPS");
      return res.json();
    },
    onSuccess: () => {
      toast.success("UPS agregada a la agencia");
      setModeloUps("");
      queryClient.invalidateQueries({ queryKey: ["calculos-central"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["ups"] });
    },
    onError: () => toast.error("Error al registrar UPS"),
  });

  const deleteItem = useMutation({
    mutationFn: async ({ tipo, id }: { tipo: "impresora" | "consumible" | "ups"; id: number }) => {
      const endpoint =
        tipo === "impresora" ? "/api/impresoras" : tipo === "consumible" ? "/api/consumibles" : "/api/ups";
      const res = await fetch(`${endpoint}?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Registro eliminado");
      queryClient.invalidateQueries({ queryKey: ["calculos-central"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: () => toast.error("No se pudo eliminar el registro"),
  });

  if (isLoading || !agenciaActual) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-card p-8 rounded-xl border border-border text-center">
          <p className="text-sm text-muted-foreground animate-pulse">Cargando ficha operativa de la agencia...</p>
        </div>
      </div>
    );
  }

  // Métricas rápidas de la agencia
  const totalImpresorasAgencia = impresorasAgencia.reduce((acc: number, i: any) => acc + i.cantidad, 0);
  const totalConsumiblesAgencia = consumiblesAgencia.reduce((acc: number, c: any) => acc + c.cantidad_disponible, 0);
  const totalUpsAgencia = upsAgencia.reduce((acc: number, u: any) => acc + u.cantidad, 0);

  const consumiblesFaltantes = diagnosticoConsumibles.reduce((acc: number, c: any) => acc + c.cantidadAComprar, 0);
  const consumiblesSobrantes = diagnosticoConsumibles.reduce((acc: number, c: any) => acc + (c.cantidadSobrante || 0), 0);

  const upsFaltantes = diagnosticoUps.reduce((acc: number, u: any) => acc + u.upsFaltantes, 0);
  const upsSobrantes = diagnosticoUps.reduce((acc: number, u: any) => acc + (u.upsSobrantes || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  Ficha Integral y Diagnóstico: Agencia {agenciaActual.nombre}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                  {agenciaActual.departamento}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Carga rápida de impresoras, consumibles y UPS con balance automático de sobrantes y faltantes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen Superior de Balance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/20 border-b border-border shrink-0 text-xs">
          <div className="p-3 bg-card rounded-lg border border-border">
            <span className="text-muted-foreground block font-medium">Impresoras Instaladas</span>
            <span className="text-xl font-extrabold text-foreground">{totalImpresorasAgencia} equipos</span>
          </div>

          <div className="p-3 bg-card rounded-lg border border-border">
            <span className="text-muted-foreground block font-medium">Stock Consumibles (Acopio)</span>
            <span className="text-xl font-extrabold text-foreground">{totalConsumiblesAgencia} paq/unid</span>
          </div>

          <div className="p-3 bg-card rounded-lg border border-border">
            <span className="text-muted-foreground block font-medium">Balance Consumibles</span>
            {consumiblesFaltantes > 0 ? (
              <span className="text-base font-black text-rose-600 flex items-center gap-1">
                <TrendingDown className="w-4 h-4" /> Falta comprar {consumiblesFaltantes}
              </span>
            ) : consumiblesSobrantes > 0 ? (
              <span className="text-base font-black text-emerald-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Sobran {consumiblesSobrantes}
              </span>
            ) : (
              <span className="text-base font-bold text-blue-600">Stock Exacto (0)</span>
            )}
          </div>

          <div className="p-3 bg-card rounded-lg border border-border">
            <span className="text-muted-foreground block font-medium">Balance UPS (1 a 1)</span>
            {upsFaltantes > 0 ? (
              <span className="text-base font-black text-rose-600 flex items-center gap-1">
                <TrendingDown className="w-4 h-4" /> Faltan {upsFaltantes} UPS
              </span>
            ) : upsSobrantes > 0 ? (
              <span className="text-base font-black text-emerald-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Sobran {upsSobrantes} UPS
              </span>
            ) : (
              <span className="text-base font-bold text-blue-600">Protección Completa</span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border px-4 bg-card shrink-0">
          <button
            onClick={() => setActiveTab("diagnostico")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "diagnostico"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 Diagnóstico y Balance Automático
          </button>
          <button
            onClick={() => setActiveTab("impresoras")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "impresoras"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            🖨️ Impresoras ({impresorasAgencia.length})
          </button>
          <button
            onClick={() => setActiveTab("consumibles")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "consumibles"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            📦 Stock de Tóner / Tinta ({consumiblesAgencia.length})
          </button>
          <button
            onClick={() => setActiveTab("ups")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "ups"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            ⚡ UPS de la Agencia ({upsAgencia.length})
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: DIAGNÓSTICO EN VIVO */}
          {activeTab === "diagnostico" && (
            <div className="space-y-6">
              {/* Sección Consumibles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Balance de Consumibles por Modelo de Impresora
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Fórmula: Equipos × Consumibles Requeridos por Regla
                  </span>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Modelo Impresora</th>
                        <th className="px-4 py-2.5 text-center">Equipos</th>
                        <th className="px-4 py-2.5">Consumible</th>
                        <th className="px-4 py-2.5 text-center">Stock Físico (Acopio)</th>
                        <th className="px-4 py-2.5 text-center">Requerido (Regla)</th>
                        <th className="px-4 py-2.5 text-right font-bold">Diagnóstico (Falta / Sobra)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {diagnosticoConsumibles.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                            No hay impresoras registradas en esta agencia para calcular consumibles.
                          </td>
                        </tr>
                      ) : (
                        diagnosticoConsumibles.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 font-bold text-foreground">
                              {item.marca} {item.modeloImpresora}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono font-bold">
                              {item.cantidadImpresoras}
                            </td>
                            <td className="px-4 py-2.5">{item.tipoConsumible}</td>
                            <td className="px-4 py-2.5 text-center font-mono font-bold text-foreground">
                              {item.existenciaActual}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono font-bold text-foreground">
                              {item.cantidadRequerida}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold">
                              {item.cantidadAComprar > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30">
                                  🔴 Falta Comprar {item.cantidadAComprar}
                                </span>
                              ) : item.cantidadSobrante > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                                  🟢 Sobran {item.cantidadSobrante} en stock
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30">
                                  🔵 Cubierto Exacto (0)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sección UPS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Balance de UPS por Capacidad Requerida
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Fórmula: 1 Impresora = 1 UPS de la capacidad VA requerida
                  </span>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Modelo Impresora</th>
                        <th className="px-4 py-2.5 text-center">Equipos</th>
                        <th className="px-4 py-2.5 text-center">Potencia UPS (VA)</th>
                        <th className="px-4 py-2.5 text-center">UPS Existentes en Agencia</th>
                        <th className="px-4 py-2.5 text-right font-bold">Diagnóstico UPS (Falta / Sobra)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {diagnosticoUps.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                            No hay impresoras registradas en esta agencia para calcular UPS.
                          </td>
                        </tr>
                      ) : (
                        diagnosticoUps.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 font-bold text-foreground">
                              {item.marcaImpresora} {item.modeloImpresora}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono font-bold">
                              {item.cantidadImpresoras}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-600">
                                {item.upsRequeridaVa} VA
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono font-bold text-foreground">
                              {item.upsExistentes}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold">
                              {item.upsFaltantes > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30">
                                  🔴 Faltan {item.upsFaltantes} UPS
                                </span>
                              ) : item.upsSobrantes > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                                  🟢 Sobran {item.upsSobrantes} UPS
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30">
                                  🔵 1 a 1 Protegido
                                </span>
                              )}
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

          {/* TAB 2: GESTIÓN DE IMPRESORAS */}
          {activeTab === "impresoras" && (
            <div className="space-y-4">
              {esAdmin && (
                <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Registrar / Agregar Impresoras a esta Agencia
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <select
                      value={nuevaMarca}
                      onChange={(e) => setNuevaMarca(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-background rounded-md border border-border"
                    >
                      <option value="Epson">Epson</option>
                      <option value="HP">HP</option>
                      <option value="Canon">Canon</option>
                      <option value="Brother">Brother</option>
                      <option value="Kyocera">Kyocera</option>
                      <option value="Xerox">Xerox</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Modelo (L3250, 107W, MF455...)"
                      value={nuevoModelo}
                      onChange={(e) => setNuevoModelo(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-background rounded-md border border-border"
                    />
                    <select
                      value={nuevaTipoConsumible}
                      onChange={(e) => setNuevaTipoConsumible(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-background rounded-md border border-border font-medium"
                    >
                      <option value="Tóner">Tóner</option>
                      <option value="Tinta">Tinta</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Cantidad"
                      value={nuevaCantidadImp}
                      onChange={(e) => setNuevaCantidadImp(Number(e.target.value))}
                      className="px-3 py-1.5 text-xs bg-background rounded-md border border-border font-bold"
                    />
                    <button
                      onClick={() => addImpresora.mutate()}
                      disabled={!nuevoModelo.trim() || addImpresora.isPending}
                      className="px-3 py-1.5 bg-primary hover:bg-primary-600 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Impresora</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Marca</th>
                      <th className="px-4 py-2.5">Modelo</th>
                      <th className="px-4 py-2.5 text-center">Tipo Insumo</th>
                      <th className="px-4 py-2.5 text-center">Cantidad</th>
                      <th className="px-4 py-2.5">Estado</th>
                      {esAdmin && <th className="px-4 py-2.5 text-right">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {impresorasAgencia.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                          No hay impresoras registradas en esta agencia.
                        </td>
                      </tr>
                    ) : (
                      impresorasAgencia.map((imp: any) => (
                        <tr key={imp.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-bold">{imp.marca}</td>
                          <td className="px-4 py-2.5 font-semibold text-foreground">{imp.modelo}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-muted border border-border">
                              {imp.tipo_consumible || "Tóner"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-sm">
                            {imp.cantidad}
                          </td>
                          <td className="px-4 py-2.5 text-emerald-600">{imp.estado}</td>
                          {esAdmin && (
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => deleteItem.mutate({ tipo: "impresora", id: imp.id })}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GESTIÓN DE CONSUMIBLES / ACOPIOS */}
          {activeTab === "consumibles" && (
            <div className="space-y-4">
              {esAdmin && (
                <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cargar / Actualizar Stock Físico (Acopio) de Tóner o Tinta
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <select
                        value={modeloConsumible}
                        onChange={(e) => {
                          setModeloConsumible(e.target.value);
                          const imp = impresorasAgencia.find((i: any) => i.modelo === e.target.value);
                          if (imp) {
                            setTipoConsumible(imp.tipo_consumible || "Tóner");
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-background rounded-md border border-border font-medium"
                      >
                        <option value="">Seleccione una impresora de esta agencia...</option>
                        {impresorasAgencia.map((imp: any) => (
                          <option key={imp.id} value={imp.modelo}>
                            {imp.marca} {imp.modelo} ({imp.tipo_consumible || "Tóner"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-semibold">Tipo:</span>
                      <span className="px-2.5 py-1 text-xs font-bold bg-muted rounded-md border border-border">
                        {tipoConsumible}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Stock"
                        value={cantidadConsumible}
                        onChange={(e) => setCantidadConsumible(Number(e.target.value))}
                        className="w-24 px-3 py-1.5 text-xs bg-background rounded-md border border-border font-bold"
                      />
                      <button
                        onClick={() => addConsumible.mutate()}
                        disabled={!modeloConsumible.trim() || addConsumible.isPending}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-600 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Guardar Stock</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Tipo</th>
                      <th className="px-4 py-2.5">Modelo Relacionado</th>
                      <th className="px-4 py-2.5 text-center">Stock Físico Actual (Acopio)</th>
                      {esAdmin && <th className="px-4 py-2.5 text-right">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {consumiblesAgencia.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                          No hay consumibles registrados en esta agencia.
                        </td>
                      </tr>
                    ) : (
                      consumiblesAgencia.map((c: any) => (
                        <tr key={c.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-bold">{c.tipo_consumible}</td>
                          <td className="px-4 py-2.5 font-semibold text-foreground">{c.modelo_relacionado}</td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-sm text-foreground">
                            {c.cantidad_disponible}
                          </td>
                          {esAdmin && (
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => deleteItem.mutate({ tipo: "consumible", id: c.id })}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: GESTIÓN DE UPS */}
          {activeTab === "ups" && (
            <div className="space-y-4">
              {esAdmin && (
                <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Registrar / Agregar UPS a esta Agencia
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <select
                      value={marcaUps}
                      onChange={(e) => setMarcaUps(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-background rounded-md border border-border"
                    >
                      <option value="Forza">Forza</option>
                      <option value="Tripp Lite">Tripp Lite</option>
                      <option value="APC">APC</option>
                      <option value="CyberPower">CyberPower</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Modelo UPS (NT-511...)"
                      value={modeloUps}
                      onChange={(e) => setModeloUps(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-background rounded-md border border-border"
                    />

                    <select
                      value={capacidadUps}
                      onChange={(e) => setCapacidadUps(Number(e.target.value))}
                      className="px-3 py-1.5 text-xs bg-background rounded-md border border-border font-semibold"
                    >
                      <option value={500}>500 VA</option>
                      <option value={550}>550 VA (Compatible modelos livianos)</option>
                      <option value={750}>750 VA (Estándar recomendado)</option>
                      <option value={1000}>1000 VA</option>
                      <option value={1500}>1500 VA</option>
                      <option value={2200}>2200 VA</option>
                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="Cantidad"
                      value={cantidadUps}
                      onChange={(e) => setCantidadUps(Number(e.target.value))}
                      className="px-3 py-1.5 text-xs bg-background rounded-md border border-border font-bold"
                    />

                    <button
                      onClick={() => addUps.mutate()}
                      disabled={!modeloUps.trim() || addUps.isPending}
                      className="px-3 py-1.5 bg-primary hover:bg-primary-600 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar UPS</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    * Si tu agencia tiene modelos livianos o de tinta como la L3250, el requerimiento se cubre con UPS de 550 VA o 750 VA indistintamente.
                  </p>
                </div>
              )}

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Marca</th>
                      <th className="px-4 py-2.5">Modelo</th>
                      <th className="px-4 py-2.5 text-center">Potencia (VA)</th>
                      <th className="px-4 py-2.5 text-center">Cantidad</th>
                      {esAdmin && <th className="px-4 py-2.5 text-right">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {upsAgencia.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                          No hay UPS registradas en esta agencia.
                        </td>
                      </tr>
                    ) : (
                      upsAgencia.map((u: any) => (
                        <tr key={u.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-bold">{u.marca}</td>
                          <td className="px-4 py-2.5 font-semibold text-foreground">{u.modelo}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-600">
                              {u.capacidad_va} VA
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-sm text-foreground">
                            {u.cantidad}
                          </td>
                          {esAdmin && (
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => deleteItem.mutate({ tipo: "ups", id: u.id })}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground">
            Los cambios en impresoras, consumibles y UPS se reflejan al instante en todos los reportes y órdenes de compra.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-primary-600 text-white font-semibold text-xs rounded-md shadow-xs transition-all cursor-pointer"
          >
            Listo / Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
}
