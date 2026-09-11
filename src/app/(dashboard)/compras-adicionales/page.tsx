"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  ShoppingCart,
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface CompraItem {
  id: number;
  descripcion: string;
  cantidad: number;
  observaciones: string | null;
  prioridad: "Alta" | "Media" | "Baja";
  fecha_creacion: string;
}

export default function ComprasAdicionalesPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const esAdmin = session?.user?.role === "admin";

  const [search, setSearch] = useState("");
  const [filterPrioridad, setFilterPrioridad] = useState("todas");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CompraItem | null>(null);

  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState("");
  const [prioridad, setPrioridad] = useState<"Alta" | "Media" | "Baja">("Media");

  const { data: compras = [], isLoading } = useQuery<CompraItem[]>({
    queryKey: ["compras-adicionales"],
    queryFn: async () => {
      const res = await fetch("/api/compras-adicionales");
      if (!res.ok) throw new Error("Error obteniendo compras");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = payload.id ? "PUT" : "POST";
      const res = await fetch("/api/compras-adicionales", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al guardar");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingItem ? "Compra actualizada" : "Compra adicional registrada con éxito");
      queryClient.invalidateQueries({ queryKey: ["compras-adicionales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Error al guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/compras-adicionales?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Artículo eliminado");
      queryClient.invalidateQueries({ queryKey: ["compras-adicionales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setDescripcion("");
    setCantidad(1);
    setObservaciones("");
    setPrioridad("Media");
    setModalOpen(true);
  };

  const openEditModal = (item: CompraItem) => {
    setEditingItem(item);
    setDescripcion(item.descripcion);
    setCantidad(item.cantidad);
    setObservaciones(item.observaciones || "");
    setPrioridad(item.prioridad);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim() || !cantidad) {
      toast.error("Complete los campos obligatorios");
      return;
    }

    saveMutation.mutate({
      id: editingItem?.id,
      descripcion: descripcion.trim(),
      cantidad: Number(cantidad),
      observaciones: observaciones.trim(),
      prioridad,
    });
  };

  const handleDelete = (item: CompraItem) => {
    if (confirm(`¿Eliminar requerimiento de "${item.descripcion}"?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const filtered = compras.filter((c) => {
    const matchesSearch =
      c.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      (c.observaciones && c.observaciones.toLowerCase().includes(search.toLowerCase()));
    const matchesPrioridad = filterPrioridad === "todas" || c.prioridad === filterPrioridad;
    return matchesSearch && matchesPrioridad;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Compras Adicionales de Tecnología
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro de accesorios, periféricos y repuestos (se consolidan automáticamente en el pedido general)
          </p>
        </div>

        {esAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-md text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Compra Adicional</span>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por descripción u observaciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={filterPrioridad}
            onChange={(e) => setFilterPrioridad(e.target.value)}
            className="px-3 py-2 text-xs rounded-md bg-background border border-border text-foreground focus:outline-hidden"
          >
            <option value="todas">Todas las Prioridades</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3.5">Artículo / Descripción</th>
                <th className="px-6 py-3.5 text-center">Cantidad Requerida</th>
                <th className="px-6 py-3.5">Prioridad</th>
                <th className="px-6 py-3.5">Observaciones / Justificación</th>
                <th className="px-6 py-3.5">Fecha Registro</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando requerimientos de compras adicionales...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No se encontraron compras adicionales registradas.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-foreground">
                      {c.descripcion}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-block px-3 py-1 rounded-md bg-muted font-mono font-bold text-sm text-foreground">
                        {c.cantidad}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          c.prioridad === "Alta"
                            ? "bg-rose-500/10 text-rose-600 border border-rose-500/30"
                            : c.prioridad === "Media"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                            : "bg-slate-500/10 text-slate-600 border border-slate-500/30"
                        }`}
                      >
                        {c.prioridad}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground max-w-sm">
                      {c.observaciones || "-"}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {formatDate(c.fecha_creacion)}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      {esAdmin ? (
                        <>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
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
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              {editingItem ? "Editar Compra Adicional" : "Registrar Compra Adicional"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Descripción del Artículo *
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Mouse Óptico, Teclado USB, Disco SSD, Switch..."
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Cantidad Requerida *
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

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Prioridad
                  </label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Observaciones / Justificación
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Justificación de compra, áreas beneficiadas..."
                  rows={3}
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
                  {saveMutation.isPending ? "Guardando..." : editingItem ? "Actualizar" : "Registrar Compra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
