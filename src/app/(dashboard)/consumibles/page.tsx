"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface ConsumibleItem {
  id: number;
  agencia_id: number;
  impresora_id?: number | null;
  agencia_nombre: string;
  departamento: string;
  tipo_consumible: string;
  modelo_relacionado: string;
  cantidad_disponible: number;
  fecha_actualizacion: string;
}

export default function ConsumiblesPage() {
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
  const [filterTipo, setFilterTipo] = useState("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsumibleItem | null>(null);

  const [agenciaId, setAgenciaId] = useState<number | string>("");
  const [impresoraId, setImpresoraId] = useState<number | string>("");
  const [tipoConsumible, setTipoConsumible] = useState("Tóner");
  const [modeloRelacionado, setModeloRelacionado] = useState("");
  const [cantidadDisponible, setCantidadDisponible] = useState(1);

  const { data: consumibles = [], isLoading } = useQuery<ConsumibleItem[]>({
    queryKey: ["consumibles"],
    queryFn: async () => {
      const res = await fetch("/api/consumibles");
      if (!res.ok) throw new Error("Error obteniendo consumibles");
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

  const { data: impresoras = [] } = useQuery({
    queryKey: ["impresoras"],
    queryFn: async () => {
      const res = await fetch("/api/impresoras");
      return res.json();
    },
  });

  // Filtrar impresoras de la agencia seleccionada
  const impresorasDeAgencia = impresoras.filter((i: any) => String(i.agencia_id) === String(agenciaId));

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = payload.id ? "PUT" : "POST";
      const res = await fetch("/api/consumibles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al guardar consumible");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingItem ? "Stock actualizado" : "Consumible registrado");
      queryClient.invalidateQueries({ queryKey: ["consumibles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Error al guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/consumibles?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Consumible eliminado");
      queryClient.invalidateQueries({ queryKey: ["consumibles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const openCreateModal = () => {
    setEditingItem(null);
    const primeraAgencia = agencias[0]?.id || "";
    setAgenciaId(primeraAgencia);
    const impsPrimera = impresoras.filter((i: any) => String(i.agencia_id) === String(primeraAgencia));
    if (impsPrimera.length > 0) {
      setImpresoraId(impsPrimera[0].id);
      setModeloRelacionado(impsPrimera[0].modelo);
      setTipoConsumible(impsPrimera[0].tipo_consumible || "Tóner");
    } else {
      setImpresoraId("");
      setModeloRelacionado("");
      setTipoConsumible("Tóner");
    }
    setCantidadDisponible(1);
    setModalOpen(true);
  };

  const openEditModal = (item: ConsumibleItem) => {
    setEditingItem(item);
    setAgenciaId(item.agencia_id);
    setImpresoraId(item.impresora_id || "");
    setTipoConsumible(item.tipo_consumible);
    setModeloRelacionado(item.modelo_relacionado);
    setCantidadDisponible(item.cantidad_disponible);
    setModalOpen(true);
  };

  const handleAgenciaChange = (selectedAgenciaId: string) => {
    setAgenciaId(selectedAgenciaId);
    const imps = impresoras.filter((i: any) => String(i.agencia_id) === String(selectedAgenciaId));
    if (imps.length > 0) {
      setImpresoraId(imps[0].id);
      setModeloRelacionado(imps[0].modelo);
      setTipoConsumible(imps[0].tipo_consumible || "Tóner");
    } else {
      setImpresoraId("");
      setModeloRelacionado("");
    }
  };

  const handleImpresoraChange = (selectedImpId: string) => {
    setImpresoraId(selectedImpId);
    const imp = impresoras.find((i: any) => String(i.id) === String(selectedImpId));
    if (imp) {
      setModeloRelacionado(imp.modelo);
      setTipoConsumible(imp.tipo_consumible || "Tóner");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agenciaId || !modeloRelacionado.trim()) {
      toast.error("Por favor seleccione la agencia y la impresora");
      return;
    }

    saveMutation.mutate({
      id: editingItem?.id,
      agencia_id: Number(agenciaId),
      impresora_id: impresoraId ? Number(impresoraId) : null,
      tipo_consumible: tipoConsumible,
      modelo_relacionado: modeloRelacionado.trim(),
      cantidad_disponible: Number(cantidadDisponible),
    });
  };

  const handleDelete = (item: ConsumibleItem) => {
    if (confirm(`¿Eliminar el registro de stock de ${item.tipo_consumible} ${item.modelo_relacionado} en ${item.agencia_nombre}?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const filteredConsumibles = consumibles.filter((c) => {
    const matchesSearch =
      c.modelo_relacionado.toLowerCase().includes(search.toLowerCase()) ||
      c.tipo_consumible.toLowerCase().includes(search.toLowerCase()) ||
      (c.agencia_nombre && c.agencia_nombre.toLowerCase().includes(search.toLowerCase()));
    const matchesAgencia = filterAgencia === "todas" || String(c.agencia_id) === filterAgencia;
    const matchesTipo = filterTipo === "todos" || c.tipo_consumible === filterTipo;
    return matchesSearch && matchesAgencia && matchesTipo;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Inventario de Consumibles por Agencia
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control de existencias de paquetes de tinta y tóneres en cada sucursal
          </p>
        </div>

        {esAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-md text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Consumible</span>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar modelo o agencia..."
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
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-3 py-2 text-xs rounded-md bg-background border border-border text-foreground focus:outline-hidden"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="Tinta">Tinta</option>
            <option value="Tóner">Tóner</option>
          </select>
        </div>
      </div>

      {/* Tabla de Consumibles */}
      <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3.5">Agencia</th>
                <th className="px-6 py-3.5">Tipo</th>
                <th className="px-6 py-3.5">Modelo Relacionado</th>
                <th className="px-6 py-3.5 text-center">Stock Físico Actual</th>
                <th className="px-6 py-3.5">Última Actualización</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando existencias de consumibles...
                  </td>
                </tr>
              ) : filteredConsumibles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-full">
                        <Package className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">No hay consumibles registrados</h3>
                      <p className="text-xs text-muted-foreground text-center">
                        Ingresa el stock físico de tóners y tintas que tiene cada agencia en existencia.
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs cursor-pointer transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Registrar Stock Consumible</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredConsumibles.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-foreground">{item.agencia_nombre || `Agencia #${item.agencia_id}`}</div>
                      <div className="text-xs text-muted-foreground">{item.departamento}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.tipo_consumible === "Tinta"
                            ? "bg-cyan-500/10 text-cyan-600 border border-cyan-500/30"
                            : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/30"
                        }`}
                      >
                        {item.tipo_consumible}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-foreground">
                      {item.modelo_relacionado}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-block px-3 py-1 rounded-md bg-muted font-mono font-bold text-base text-foreground">
                        {item.cantidad_disponible}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {formatDate(item.fecha_actualizacion)}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      {esAdmin ? (
                        <>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Editar Stock"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Eliminar Registro"
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
              {editingItem ? "Actualizar Stock de Consumible" : "Registrar Consumible en Agencia"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  1. Seleccione la Agencia *
                </label>
                <select
                  value={agenciaId}
                  onChange={(e) => handleAgenciaChange(e.target.value)}
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

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  2. Elija la Impresora de esta Agencia *
                </label>
                {impresorasDeAgencia.length === 0 ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                    Esta agencia aún no tiene impresoras asignadas. Primero registra una impresora en el módulo de Impresoras o digita el modelo manualmente abajo:
                    <input
                      type="text"
                      value={modeloRelacionado}
                      onChange={(e) => setModeloRelacionado(e.target.value)}
                      placeholder="Ej: L3250, 107W..."
                      className="mt-2 w-full px-3 py-1.5 text-xs bg-background text-foreground rounded-md border border-border"
                      required
                    />
                  </div>
                ) : (
                  <select
                    value={impresoraId}
                    onChange={(e) => handleImpresoraChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold text-foreground"
                    required
                  >
                    <option value="">Seleccione un modelo existente en la agencia...</option>
                    {impresorasDeAgencia.map((imp: any) => (
                      <option key={imp.id} value={imp.id}>
                        {imp.marca} {imp.modelo} — ({imp.tipo_consumible || "Tóner"}) [x{imp.cantidad} equipos]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Tipo de Insumo
                  </label>
                  <input
                    type="text"
                    value={tipoConsumible}
                    readOnly
                    className="w-full px-3 py-2 text-sm bg-muted/60 text-foreground font-semibold rounded-md border border-border cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Stock Físico Disponible *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cantidadDisponible}
                    onChange={(e) => setCantidadDisponible(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary font-bold"
                    required
                  />
                </div>
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
                  {saveMutation.isPending ? "Guardando..." : editingItem ? "Actualizar Stock" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
