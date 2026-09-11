"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Printer,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface ImpresoraConAgencia {
  id: number;
  agencia_id: number;
  agencia_nombre: string;
  departamento: string;
  marca: string;
  modelo: string;
  tipo_consumible: string;
  cantidad: number;
  estado: string;
  observaciones: string | null;
  fecha_registro: string;
}

export default function ImpresorasPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const esAdmin = session?.user?.role !== "lector";

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) setSearch(decodeURIComponent(q));
    }
  }, []);

  const [filterAgencia, setFilterAgencia] = useState("todas");
  const [filterMarca, setFilterMarca] = useState("todas");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingImpresora, setEditingImpresora] = useState<ImpresoraConAgencia | null>(null);

  const [agenciaId, setAgenciaId] = useState<number | string>("");
  const [marca, setMarca] = useState("Epson");
  const [modelo, setModelo] = useState("");
  const [tipoConsumible, setTipoConsumible] = useState("Tóner");
  const [cantidad, setCantidad] = useState(1);
  const [estado, setEstado] = useState("Operativa");
  const [observaciones, setObservaciones] = useState("");

  const { data: impresoras = [], isLoading } = useQuery<ImpresoraConAgencia[]>({
    queryKey: ["impresoras"],
    queryFn: async () => {
      const res = await fetch("/api/impresoras");
      if (!res.ok) throw new Error("Error obteniendo impresoras");
      return res.json();
    },
  });

  const { data: agencias = [] } = useQuery({
    queryKey: ["agencias"],
    queryFn: async () => {
      const res = await fetch("/api/agencias");
      return res.json();
    },
  });

  const { data: reglas = [] } = useQuery({
    queryKey: ["reglas"],
    queryFn: async () => {
      const res = await fetch("/api/reglas");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = payload.id ? "PUT" : "POST";
      const res = await fetch("/api/impresoras", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al guardar impresora");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingImpresora ? "Impresora actualizada" : "Impresora registrada");
      queryClient.invalidateQueries({ queryKey: ["impresoras"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Error al guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/impresoras?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar impresora");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Impresora eliminada con éxito");
      queryClient.invalidateQueries({ queryKey: ["impresoras"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: () => toast.error("No se pudo eliminar la impresora"),
  });

  const openCreateModal = () => {
    setEditingImpresora(null);
    setAgenciaId(agencias[0]?.id || "");
    setMarca("Epson");
    setModelo("");
    setTipoConsumible("Tóner");
    setCantidad(1);
    setEstado("Operativa");
    setObservaciones("");
    setModalOpen(true);
  };

  const openEditModal = (imp: ImpresoraConAgencia) => {
    setEditingImpresora(imp);
    setAgenciaId(imp.agencia_id);
    setMarca(imp.marca);
    setModelo(imp.modelo);
    setTipoConsumible(imp.tipo_consumible || "Tóner");
    setCantidad(imp.cantidad);
    setEstado(imp.estado);
    setObservaciones(imp.observaciones || "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingImpresora(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agenciaId || !marca.trim() || !modelo.trim()) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }

    saveMutation.mutate({
      id: editingImpresora?.id,
      agencia_id: Number(agenciaId),
      marca,
      modelo,
      tipo_consumible: tipoConsumible,
      cantidad: Number(cantidad),
      estado,
      observaciones,
    });
  };

  const handleDelete = (imp: ImpresoraConAgencia) => {
    if (confirm(`¿Eliminar impresora ${imp.marca} ${imp.modelo} de la agencia ${imp.agencia_nombre}?`)) {
      deleteMutation.mutate(imp.id);
    }
  };

  const marcas = Array.from(new Set(impresoras.map((i) => i.marca))).filter(Boolean);

  const filteredImpresoras = impresoras.filter((i) => {
    const matchesSearch =
      i.modelo.toLowerCase().includes(search.toLowerCase()) ||
      i.marca.toLowerCase().includes(search.toLowerCase()) ||
      (i.agencia_nombre && i.agencia_nombre.toLowerCase().includes(search.toLowerCase()));
    const matchesAgencia = filterAgencia === "todas" || String(i.agencia_id) === filterAgencia;
    const matchesMarca = filterMarca === "todas" || i.marca === filterMarca;
    return matchesSearch && matchesAgencia && matchesMarca;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Printer className="w-6 h-6 text-primary" />
            Parque de Impresoras por Agencia
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro de impresoras y cálculo automático de consumibles y UPS asociadas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reglas"
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-muted text-secondary-foreground rounded-md text-sm font-medium border border-border transition-all"
          >
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <span>Configurar Reglas de Modelos</span>
          </Link>

          {esAdmin && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-md text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Impresora</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar modelo, marca o agencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={filterAgencia}
            onChange={(e) => setFilterAgencia(e.target.value)}
            className="px-3 py-2 text-xs rounded-md bg-background border border-border text-foreground focus:outline-hidden"
          >
            <option value="todas">Todas las Agencias</option>
            {agencias.map((a: any) => (
              <option key={a.id} value={String(a.id)}>
                {a.nombre}
              </option>
            ))}
          </select>

          <select
            value={filterMarca}
            onChange={(e) => setFilterMarca(e.target.value)}
            className="px-3 py-2 text-xs rounded-md bg-background border border-border text-foreground focus:outline-hidden"
          >
            <option value="todas">Todas las Marcas</option>
            {marcas.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Impresoras */}
      <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3.5">Agencia</th>
                <th className="px-6 py-3.5">Marca y Modelo</th>
                <th className="px-6 py-3.5 text-center">Tipo</th>
                <th className="px-6 py-3.5 text-center">Cantidad</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5">Observaciones</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando inventario de impresoras...
                  </td>
                </tr>
              ) : filteredImpresoras.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full">
                        <Printer className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">No hay impresoras registradas</h3>
                      <p className="text-xs text-muted-foreground text-center">
                        Registra los equipos asignados a cada agencia para que el sistema calcule automáticamente los consumibles requeridos.
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs cursor-pointer transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Registrar Impresora</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredImpresoras.map((imp) => (
                  <tr key={imp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-foreground">{imp.agencia_nombre || `Agencia #${imp.agencia_id}`}</div>
                      <div className="text-xs text-muted-foreground">{imp.departamento}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-block font-semibold text-foreground">
                        {imp.marca} {imp.modelo}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          imp.tipo_consumible === "Tinta"
                            ? "bg-cyan-500/10 text-cyan-600 border border-cyan-500/30"
                            : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/30"
                        }`}
                      >
                        {imp.tipo_consumible || "Tóner"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold text-foreground">
                      <span className="px-2.5 py-1 rounded-md bg-muted font-mono text-sm">
                        {imp.cantidad}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          imp.estado === "Operativa"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                        }`}
                      >
                        <CheckCircle className="w-3 h-3" />
                        {imp.estado}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground max-w-xs truncate">
                      {imp.observaciones || "-"}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      {esAdmin ? (
                        <>
                          <button
                            onClick={() => openEditModal(imp)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(imp)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Eliminar"
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
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              {editingImpresora ? "Editar Impresora" : "Registrar Impresora en Agencia"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  1. Seleccione la Agencia *
                </label>
                <select
                  value={agenciaId}
                  onChange={(e) => setAgenciaId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary font-medium"
                  required
                >
                  <option value="">Seleccione una agencia...</option>
                  {agencias.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} {a.cantidad_acopios ? `(${a.cantidad_acopios} acopios)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Marca *
                  </label>
                  <select
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="Epson">Epson</option>
                    <option value="HP">HP</option>
                    <option value="Canon">Canon</option>
                    <option value="Brother">Brother</option>
                    <option value="Kyocera">Kyocera</option>
                    <option value="Xerox">Xerox</option>
                    <option value="Lexmark">Lexmark</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="L3250, 107W, LBP6030, MF455, etc."
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    ¿Utiliza Tinta o Tóner? *
                  </label>
                  <select
                    value={tipoConsumible}
                    onChange={(e) => setTipoConsumible(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary font-medium"
                    required
                  >
                    <option value="Tóner">Tóner</option>
                    <option value="Tinta">Tinta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Cantidad de Equipos *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Estado
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="Operativa">Operativa</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Dañada">Dañada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Observaciones / Ubicación
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Área de caja, servicio al cliente, oficialía..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

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
                  {saveMutation.isPending ? "Guardando..." : editingImpresora ? "Actualizar" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
