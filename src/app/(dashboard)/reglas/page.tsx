"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  SlidersHorizontal,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Regla {
  id: number;
  modelo_impresora: string;
  tipo_consumible: string;
  consumibles_requeridos_por_equipo: number;
  ups_requerida_va: number;
  ups_requerida_va_alt?: number | null;
}

export default function ReglasPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const esAdmin = session?.user?.role !== "lector";

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRegla, setEditingRegla] = useState<Regla | null>(null);

  const [modeloImpresora, setModeloImpresora] = useState("");
  const [tipoConsumible, setTipoConsumible] = useState("Tóner");
  const [consumiblesRequeridos, setConsumiblesRequeridos] = useState(2);
  const [upsRequeridaVa, setUpsRequeridaVa] = useState(750);
  const [upsRequeridaVaAlt, setUpsRequeridaVaAlt] = useState<number | string>("550");

  const { data: reglas = [], isLoading } = useQuery<Regla[]>({
    queryKey: ["reglas"],
    queryFn: async () => {
      const res = await fetch("/api/reglas");
      if (!res.ok) throw new Error("Error obteniendo reglas");
      return res.json();
    },
  });

  const { data: impresoras = [] } = useQuery({
    queryKey: ["impresoras"],
    queryFn: async () => {
      const res = await fetch("/api/impresoras");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Lista única de modelos existentes de impresoras en todo el sistema (sin duplicados y sin depender de la agencia)
  const modelosUnicosImpresoras: string[] = Array.from(
    new Set((impresoras || []).map((i: any) => String(i?.modelo || "").trim()))
  ).filter((m): m is string => Boolean(m));

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = payload.id ? "PUT" : "POST";
      const res = await fetch("/api/reglas", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al guardar regla");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingRegla ? "Regla actualizada" : "Nueva regla configurada con éxito");
      queryClient.invalidateQueries({ queryKey: ["reglas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Error al guardar regla"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/reglas?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Regla eliminada");
      queryClient.invalidateQueries({ queryKey: ["reglas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: () => toast.error("No se pudo eliminar la regla"),
  });

  const openCreateModal = () => {
    setEditingRegla(null);
    const primerModelo = modelosUnicosImpresoras[0] || "";
    setModeloImpresora(primerModelo);
    const impInfo = impresoras.find((i: any) => i.modelo === primerModelo);
    const esTinta = impInfo?.tipo_consumible === "Tinta" || /l3|ecotank/i.test(primerModelo);
    setTipoConsumible(esTinta ? "Tinta" : "Tóner");
    setConsumiblesRequeridos(2);
    setUpsRequeridaVa(750);
    setUpsRequeridaVaAlt(esTinta ? 550 : "");
    setModalOpen(true);
  };

  const openEditModal = (r: Regla) => {
    setEditingRegla(r);
    setModeloImpresora(r.modelo_impresora);
    setTipoConsumible(r.tipo_consumible);
    setConsumiblesRequeridos(r.consumibles_requeridos_por_equipo);
    setUpsRequeridaVa(r.ups_requerida_va);
    setUpsRequeridaVaAlt(r.ups_requerida_va_alt ? String(r.ups_requerida_va_alt) : "");
    setModalOpen(true);
  };

  const handleModeloSelectChange = (modelo: string) => {
    setModeloImpresora(modelo);
    const impInfo = impresoras.find((i: any) => i.modelo === modelo);
    const esTinta = impInfo?.tipo_consumible === "Tinta" || /l3|ecotank/i.test(modelo);
    setTipoConsumible(esTinta ? "Tinta" : "Tóner");
    if (esTinta) {
      setUpsRequeridaVa(750);
      setUpsRequeridaVaAlt(550);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRegla(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modeloImpresora.trim()) {
      toast.error("Seleccione o ingrese el modelo de impresora");
      return;
    }

    saveMutation.mutate({
      id: editingRegla?.id,
      modelo_impresora: modeloImpresora.trim(),
      tipo_consumible: tipoConsumible,
      consumibles_requeridos_por_equipo: Number(consumiblesRequeridos),
      ups_requerida_va: Number(upsRequeridaVa),
      ups_requerida_va_alt: upsRequeridaVaAlt ? Number(upsRequeridaVaAlt) : null,
    });
  };

  const handleDelete = (r: Regla) => {
    if (confirm(`¿Eliminar la regla para el modelo ${r.modelo_impresora}?`)) {
      deleteMutation.mutate(r.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-primary" />
            Reglas Automáticas de Equipos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configuración dinámica de consumibles y UPS requeridas por modelo (sin tocar código)
          </p>
        </div>

        {esAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-md text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Nueva Regla de Modelo</span>
          </button>
        )}
      </div>

      {/* Info Card Explaining dynamic scalability */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs text-muted-foreground flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-foreground text-sm mb-1">
            Escalabilidad Dinámica y Requerimientos Automáticos
          </h4>
          <p>
            Cualquier modelo registrado aquí se asociará inmediatamente en el cálculo automático de consumibles
            y de UPS (fórmula: 1 Impresora = 1 UPS de la capacidad VA indicada). Los reportes y pedidos consolidados
            se actualizarán al instante sin necesidad de modificar el código fuente de la aplicación.
          </p>
        </div>
      </div>

      {/* Tabla de Reglas */}
      <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3.5">Modelo de Impresora</th>
                <th className="px-6 py-3.5">Tipo de Consumible</th>
                <th className="px-6 py-3.5 text-center">Consumibles Requeridos por Equipo</th>
                <th className="px-6 py-3.5 text-center">Capacidad UPS Requerida</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando reglas automáticas...
                  </td>
                </tr>
              ) : reglas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No hay reglas configuradas actualmente.
                  </td>
                </tr>
              ) : (
                reglas.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-foreground">
                      {r.modelo_impresora}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          r.tipo_consumible.toLowerCase().includes("tinta")
                            ? "bg-cyan-500/10 text-cyan-600 border border-cyan-500/30"
                            : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/30"
                        }`}
                      >
                        {r.tipo_consumible}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="font-mono font-bold text-sm bg-muted px-3 py-1 rounded-md">
                        {r.consumibles_requeridos_por_equipo} {r.tipo_consumible.toLowerCase().includes("tinta") ? "paquetes" : "unidades"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        <span>{r.ups_requerida_va} VA</span>
                        {r.ups_requerida_va_alt && (
                          <span className="text-xs font-normal opacity-85">ó {r.ups_requerida_va_alt} VA</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      {esAdmin ? (
                        <>
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Editar Regla"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Eliminar Regla"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              {editingRegla ? "Editar Regla de Impresora" : "Configurar Nueva Regla de Impresora"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Modelo de Impresora *
                </label>
                {modelosUnicosImpresoras.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={modelosUnicosImpresoras.includes(modeloImpresora) ? modeloImpresora : "__custom__"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__custom__") {
                          setModeloImpresora("");
                        } else {
                          handleModeloSelectChange(val);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    >
                      <option value="" disabled>Seleccione un modelo registrado...</option>
                      {modelosUnicosImpresoras.map((mod: any) => (
                        <option key={mod} value={mod}>
                          {mod}
                        </option>
                      ))}
                      <option value="__custom__">+ Otro modelo (escribir manualmente)...</option>
                    </select>
                    {(!modelosUnicosImpresoras.includes(modeloImpresora) || modeloImpresora === "") && (
                      <input
                        type="text"
                        value={modeloImpresora}
                        onChange={(e) => setModeloImpresora(e.target.value)}
                        placeholder="Escriba el modelo de impresora..."
                        className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                        required
                        autoFocus
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={modeloImpresora}
                    onChange={(e) => setModeloImpresora(e.target.value)}
                    placeholder="Ej: L3250, HP 107W, LBP6030, MF455, etc."
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Tipo de Consumible *
                </label>
                <select
                  value={tipoConsumible}
                  onChange={(e) => setTipoConsumible(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="Tóner">Tóner</option>
                  <option value="Tinta">Tinta</option>
                  <option value="Cinta">Cinta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Consumibles Requeridos por Equipo *
                </label>
                <input
                  type="number"
                  min="1"
                  value={consumiblesRequeridos}
                  onChange={(e) => setConsumiblesRequeridos(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    UPS Principal *
                  </label>
                  <select
                    value={upsRequeridaVa}
                    onChange={(e) => setUpsRequeridaVa(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value={500}>500 VA</option>
                    <option value={550}>550 VA</option>
                    <option value={750}>750 VA</option>
                    <option value={1000}>1000 VA</option>
                    <option value={1500}>1500 VA</option>
                    <option value={2200}>2200 VA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    UPS Alternativa
                  </label>
                  <select
                    value={upsRequeridaVaAlt}
                    onChange={(e) => setUpsRequeridaVaAlt(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="">(Ninguna)</option>
                    <option value="500">500 VA</option>
                    <option value="550">550 VA</option>
                    <option value="750">750 VA</option>
                    <option value="1000">1000 VA</option>
                    <option value="1500">1500 VA</option>
                    <option value="2200">2200 VA</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Permite cubrir la demanda de la impresora con 2 tipos de UPS (ej. L3250 puede cubrirse con 750 VA o 550 VA).
              </p>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-primary hover:bg-primary-600 text-white transition-colors cursor-pointer disabled:opacity-60"
                >
                  {saveMutation.isPending ? "Guardando..." : editingRegla ? "Actualizar" : "Guardar Regla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
