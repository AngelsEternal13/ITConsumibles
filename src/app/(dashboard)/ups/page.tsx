"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Zap,
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface UpsItem {
  id: number;
  agencia_id: number;
  impresora_id?: number | null;
  agencia_nombre: string;
  departamento: string;
  marca: string;
  modelo: string;
  capacidad_va: number;
  cantidad: number;
  estado: string;
  fecha_registro: string;
}

export default function UpsPage() {
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
  const [filterCapacidad, setFilterCapacidad] = useState("todas");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UpsItem | null>(null);

  const [agenciaId, setAgenciaId] = useState<number | string>("");
  const [impresoraId, setImpresoraId] = useState<number | string>("");
  const [marca, setMarca] = useState("Forza");
  const [modelo, setModelo] = useState("NT-511");
  const [capacidadVa, setCapacidadVa] = useState(750);
  const [cantidad, setCantidad] = useState(1);
  const [estado, setEstado] = useState("Operativo");

  const { data: upsList = [], isLoading } = useQuery<UpsItem[]>({
    queryKey: ["ups"],
    queryFn: async () => {
      const res = await fetch("/api/ups");
      if (!res.ok) throw new Error("Error obteniendo UPS");
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

  const impresorasDeAgencia = impresoras.filter((i: any) => String(i.agencia_id) === String(agenciaId));

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = payload.id ? "PUT" : "POST";
      const res = await fetch("/api/ups", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al guardar UPS");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingItem ? "UPS actualizada" : "UPS registrada");
      queryClient.invalidateQueries({ queryKey: ["ups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Error al guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/ups?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      return res.json();
    },
    onSuccess: () => {
      toast.success("UPS eliminada");
      queryClient.invalidateQueries({ queryKey: ["ups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const openCreateModal = () => {
    setEditingItem(null);
    const primeraAgencia = agencias[0]?.id || "";
    setAgenciaId(primeraAgencia);
    const imps = impresoras.filter((i: any) => String(i.agencia_id) === String(primeraAgencia));
    if (imps.length > 0) {
      setImpresoraId(imps[0].id);
      // Asignar sugerencia de VA según el modelo
      if (imps[0].modelo.toLowerCase().includes("l3250")) {
        setCapacidadVa(550);
      } else {
        setCapacidadVa(750);
      }
    } else {
      setImpresoraId("");
      setCapacidadVa(750);
    }
    setMarca("Forza");
    setModelo("NT-511");
    setCantidad(1);
    setEstado("Operativo");
    setModalOpen(true);
  };

  const openEditModal = (item: UpsItem) => {
    setEditingItem(item);
    setAgenciaId(item.agencia_id);
    setImpresoraId(item.impresora_id || "");
    setMarca(item.marca);
    setModelo(item.modelo);
    setCapacidadVa(item.capacidad_va);
    setCantidad(item.cantidad);
    setEstado(item.estado);
    setModalOpen(true);
  };

  const handleAgenciaChange = (selectedAgenciaId: string) => {
    setAgenciaId(selectedAgenciaId);
    const imps = impresoras.filter((i: any) => String(i.agencia_id) === String(selectedAgenciaId));
    if (imps.length > 0) {
      setImpresoraId(imps[0].id);
      if (imps[0].modelo.toLowerCase().includes("l3250")) {
        setCapacidadVa(550);
      } else {
        setCapacidadVa(750);
      }
    } else {
      setImpresoraId("");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agenciaId || !marca.trim() || !modelo.trim() || !capacidadVa) {
      toast.error("Complete los datos requeridos");
      return;
    }

    saveMutation.mutate({
      id: editingItem?.id,
      agencia_id: Number(agenciaId),
      impresora_id: impresoraId ? Number(impresoraId) : null,
      marca: marca.trim(),
      modelo: modelo.trim(),
      capacidad_va: Number(capacidadVa),
      cantidad: Number(cantidad),
      estado,
    });
  };

  const handleDelete = (item: UpsItem) => {
    if (confirm(`¿Eliminar la UPS ${item.marca} ${item.modelo} de la agencia ${item.agencia_nombre}?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const capacidades = Array.from(new Set(upsList.map((u) => u.capacidad_va))).sort((a, b) => a - b);

  const filteredUps = upsList.filter((u) => {
    const matchesSearch =
      u.modelo.toLowerCase().includes(search.toLowerCase()) ||
      u.marca.toLowerCase().includes(search.toLowerCase()) ||
      (u.agencia_nombre && u.agencia_nombre.toLowerCase().includes(search.toLowerCase()));
    const matchesAgencia = filterAgencia === "todas" || String(u.agencia_id) === filterAgencia;
    const matchesCapacidad = filterCapacidad === "todas" || String(u.capacidad_va) === filterCapacidad;
    return matchesSearch && matchesAgencia && matchesCapacidad;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Parque de UPS por Agencia
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Protección de respaldo eléctrico (Regla 1 Impresora = 1 UPS)
          </p>
        </div>

        {esAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-md text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar UPS</span>
          </button>
        )}
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
            value={filterCapacidad}
            onChange={(e) => setFilterCapacidad(e.target.value)}
            className="px-3 py-2 text-xs rounded-md bg-background border border-border text-foreground focus:outline-hidden"
          >
            <option value="todas">Todas las Capacidades</option>
            {capacidades.map((c) => (
              <option key={c} value={String(c)}>
                {c} VA
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de UPS */}
      <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3.5">Agencia</th>
                <th className="px-6 py-3.5">Marca y Modelo</th>
                <th className="px-6 py-3.5 text-center">Capacidad (VA)</th>
                <th className="px-6 py-3.5 text-center">Cantidad</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando inventario de UPS...
                  </td>
                </tr>
              ) : filteredUps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="p-3 bg-amber-500/10 text-amber-600 rounded-full">
                        <Zap className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">No hay UPS registradas</h3>
                      <p className="text-xs text-muted-foreground text-center">
                        Ingresa las unidades de respaldo eléctrico (UPS) que tiene cada agencia según su capacidad en VA.
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-xs cursor-pointer transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Registrar UPS</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUps.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-foreground">{u.agencia_nombre || `Agencia #${u.agencia_id}`}</div>
                      <div className="text-xs text-muted-foreground">{u.departamento}</div>
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-foreground">
                      {u.marca} {u.modelo}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        {u.capacidad_va} VA
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold text-foreground">
                      <span className="px-3 py-1 rounded-md bg-muted font-mono text-sm">
                        {u.cantidad}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      {esAdmin ? (
                        <>
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Editar UPS"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Eliminar UPS"
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
              {editingItem ? "Editar UPS" : "Registrar UPS en Agencia"}
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
                  2. Elija la Impresora que respaldará este UPS (Opcional / Sugerido)
                </label>
                {impresorasDeAgencia.length === 0 ? (
                  <div className="p-2.5 bg-muted/50 border border-border rounded-lg text-xs text-muted-foreground">
                    Esta agencia no tiene impresoras asignadas aún. Puedes registrar el UPS con su capacidad en VA general.
                  </div>
                ) : (
                  <select
                    value={impresoraId}
                    onChange={(e) => setImpresoraId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary font-semibold text-foreground"
                  >
                    <option value="">Asignar a uso general de agencia (sin vincular a impresora)...</option>
                    {impresorasDeAgencia.map((imp: any) => (
                      <option key={imp.id} value={imp.id}>
                        {imp.marca} {imp.modelo} [x{imp.cantidad} equipos]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Marca del UPS *
                  </label>
                  <select
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="Forza">Forza</option>
                    <option value="Tripp Lite">Tripp Lite</option>
                    <option value="APC">APC</option>
                    <option value="CyberPower">CyberPower</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Modelo UPS *
                  </label>
                  <input
                    type="text"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="NT-511, FX-1500LCD..."
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Capacidad (VA) *
                  </label>
                  <select
                    value={capacidadVa}
                    onChange={(e) => setCapacidadVa(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary font-bold text-foreground"
                  >
                    <option value={500}>500 VA</option>
                    <option value={550}>550 VA (Compatible modelos livianos/tinta)</option>
                    <option value={750}>750 VA (Estándar recomendado)</option>
                    <option value={1000}>1000 VA</option>
                    <option value={1500}>1500 VA</option>
                    <option value={2200}>2200 VA</option>
                  </select>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Para modelos como Epson o impresoras pequeñas, 550 VA o 750 VA cubren el requerimiento.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Cantidad de UPS *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
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
                  {saveMutation.isPending ? "Guardando..." : editingItem ? "Actualizar" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
