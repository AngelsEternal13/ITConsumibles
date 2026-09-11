"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { FichaAgenciaModal } from "@/components/agencias/ficha-agencia-modal";

interface Agencia {
  id: number;
  nombre: string;
  departamento: string;
  cantidad_acopios: number;
  estado: "Activa" | "Inactiva";
  fecha_creacion: string;
}

export default function AgenciasPage() {
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
  const [filterDepto, setFilterDepto] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgencia, setEditingAgencia] = useState<Agencia | null>(null);
  const [selectedFichaAgenciaId, setSelectedFichaAgenciaId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [cantidadAcopios, setCantidadAcopios] = useState(0);
  const [departamento, setDepartamento] = useState("Principal");
  const [estado, setEstado] = useState<"Activa" | "Inactiva">("Activa");

  const { data: agencias = [], isLoading } = useQuery<Agencia[]>({
    queryKey: ["agencias"],
    queryFn: async () => {
      const res = await fetch("/api/agencias");
      if (!res.ok) throw new Error("Error obteniendo agencias");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: number; nombre: string; departamento: string; cantidad_acopios: number; estado: string }) => {
      const method = payload.id ? "PUT" : "POST";
      const res = await fetch("/api/agencias", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al guardar agencia");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingAgencia ? "Agencia actualizada con éxito" : "Agencia registrada con éxito");
      queryClient.invalidateQueries({ queryKey: ["agencias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al guardar");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/agencias?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar agencia");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Agencia eliminada con éxito");
      queryClient.invalidateQueries({ queryKey: ["agencias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: () => toast.error("No se pudo eliminar la agencia"),
  });

  const openCreateModal = () => {
    setEditingAgencia(null);
    setNombre("");
    setCantidadAcopios(0);
    setDepartamento("Principal");
    setEstado("Activa");
    setModalOpen(true);
  };

  const openEditModal = (ag: Agencia) => {
    setEditingAgencia(ag);
    setNombre(ag.nombre);
    setCantidadAcopios(ag.cantidad_acopios || 0);
    setDepartamento(ag.departamento || "Principal");
    setEstado(ag.estado);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAgencia(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre de la agencia es obligatorio");
      return;
    }
    saveMutation.mutate({
      id: editingAgencia?.id,
      nombre,
      departamento: departamento.trim() || "Principal",
      cantidad_acopios: Number(cantidadAcopios) || 0,
      estado,
    });
  };

  const handleDelete = (ag: Agencia) => {
    if (confirm(`¿Está seguro de eliminar la agencia "${ag.nombre}"? Sus equipos y consumibles asociados también se verán afectados.`)) {
      deleteMutation.mutate(ag.id);
    }
  };

  // Departamentos únicos para filtro
  const deptos = Array.from(new Set(agencias.map((a) => a.departamento))).filter(Boolean);

  // Filtrado
  const filteredAgencias = agencias.filter((ag) => {
    const matchesSearch =
      ag.nombre.toLowerCase().includes(search.toLowerCase()) ||
      ag.departamento.toLowerCase().includes(search.toLowerCase());
    const matchesDepto = filterDepto === "todos" || ag.departamento === filterDepto;
    const matchesEstado = filterEstado === "todos" || ag.estado === filterEstado;
    return matchesSearch && matchesDepto && matchesEstado;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Gestión de Agencias
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro, control operativo y estados de sucursales en todo el país
          </p>
        </div>

        <div className="flex items-center gap-2">
          {agencias.length > 0 && (
            <button
              onClick={() => setSelectedFichaAgenciaId(agencias[0]?.id)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-semibold shadow-xs transition-all cursor-pointer"
              title="Abrir asistente de carga de impresoras, consumibles y UPS por agencia"
            >
              <Layers className="w-4 h-4" />
              <span>Carga Integral y Diagnóstico</span>
            </button>
          )}

          {esAdmin && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-md text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Agencia</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={filterDepto}
            onChange={(e) => setFilterDepto(e.target.value)}
            className="px-3 py-2 text-xs rounded-md bg-background border border-border text-foreground focus:outline-hidden"
          >
            <option value="todos">Todos los Departamentos</option>
            {deptos.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-3 py-2 text-xs rounded-md bg-background border border-border text-foreground focus:outline-hidden"
          >
            <option value="todos">Todos los Estados</option>
            <option value="Activa">Activa</option>
            <option value="Inactiva">Inactiva</option>
          </select>
        </div>
      </div>

      {/* Tabla de Agencias */}
      <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3.5">ID</th>
                <th className="px-6 py-3.5">Nombre de Agencia</th>
                <th className="px-6 py-3.5 text-center">Acopios</th>
                <th className="px-6 py-3.5">Departamento</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5">Fecha Registro</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando agencias...
                  </td>
                </tr>
              ) : filteredAgencias.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="p-3 bg-primary/10 text-primary rounded-full">
                        <Building2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">No hay agencias registradas aún</h3>
                      <p className="text-xs text-muted-foreground text-center">
                        Para comenzar a controlar impresoras, consumibles y UPS, primero debes registrar tu primera agencia o sucursal con sus acopios.
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-sm font-semibold shadow-xs cursor-pointer transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Crear Primera Agencia</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAgencias.map((ag) => (
                  <tr key={ag.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-muted-foreground">#{ag.id}</td>
                    <td className="px-6 py-3.5 font-bold text-foreground">{ag.nombre}</td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-primary border border-blue-500/30">
                        {ag.cantidad_acopios || 0} acopios
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground">{ag.departamento || "Principal"}</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          ag.estado === "Activa"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-600 border border-rose-500/30"
                        }`}
                      >
                        {ag.estado === "Activa" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {ag.estado}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {formatDate(ag.fecha_creacion)}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedFichaAgenciaId(ag.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs transition-colors cursor-pointer border border-emerald-500/30"
                        title="Ver ficha integral, cargar equipos y consultar balance"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Ficha y Diagnóstico</span>
                      </button>

                      {esAdmin ? (
                        <>
                          <button
                            onClick={() => openEditModal(ag)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                            title="Editar Agencia"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ag)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                            title="Eliminar Agencia"
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
        <div className="p-4 border-t border-border bg-muted/20 text-xs text-muted-foreground flex justify-between items-center">
          <span>Mostrando {filteredAgencias.length} de {agencias.length} agencias</span>
        </div>
      </div>

      {/* Modal de Creación / Edición */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              {editingAgencia ? "Editar Agencia" : "Registrar Nueva Agencia"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Nombre de la Agencia *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: El Rama, Jinotega, Matagalpa, Central..."
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Cantidad de Acopios que abrirá *
                </label>
                <input
                  type="number"
                  min="0"
                  value={cantidadAcopios}
                  onChange={(e) => setCantidadAcopios(Number(e.target.value))}
                  placeholder="Ej: 2, 3, 5..."
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  required
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Indica cuántos puntos de acopio dependerán de esta sucursal
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Departamento / Región (Opcional)
                </label>
                <input
                  type="text"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  placeholder="Ej: Matagalpa, Jinotega, Managua..."
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Estado Operativo
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as "Activa" | "Inactiva")}
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="Activa">Activa</option>
                  <option value="Inactiva">Inactiva</option>
                </select>
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
                  {saveMutation.isPending ? "Guardando..." : editingAgencia ? "Actualizar" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Ficha Integral de Agencia y Diagnostico */}
      {selectedFichaAgenciaId && (
        <FichaAgenciaModal
          agenciaId={selectedFichaAgenciaId}
          onClose={() => setSelectedFichaAgenciaId(null)}
          esAdmin={esAdmin}
        />
      )}
    </div>
  );
}
