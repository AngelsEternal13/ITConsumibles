"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Building2,
  Calendar,
  User,
  ArrowRight,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface TransferenciaItem {
  id: number;
  agencia_origen_id: number;
  agencia_destino_id: number;
  origenNombre: string;
  destinoNombre: string;
  tipo_articulo: string;
  descripcion: string;
  cantidad: number;
  fecha: string;
  usuario: string;
}

export default function TransferenciasPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const esLector = (session?.user as any)?.role?.toLowerCase() === "lector" || (session?.user as any)?.rol?.toLowerCase() === "lector";
  const esAdmin = !esLector;

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Estados del Formulario
  const [origenId, setOrigenId] = useState<number | string>("");
  const [destinoId, setDestinoId] = useState<number | string>("");
  const [tipoArticulo, setTipoArticulo] = useState<"consumible" | "ups" | "impresora">("consumible");
  const [articuloId, setArticuloId] = useState<number | string>("");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [maxStock, setMaxStock] = useState<number | null>(null);

  const { data: transferencias = [], isLoading } = useQuery<TransferenciaItem[]>({
    queryKey: ["transferencias"],
    queryFn: async () => {
      const res = await fetch("/api/transferencias");
      if (!res.ok) throw new Error("Error obteniendo transferencias");
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

  // Cargar artículos disponibles en la agencia de origen seleccionada
  const { data: articulosOrigen = [], isLoading: cargandoArticulos } = useQuery({
    queryKey: ["articulos-origen", origenId, tipoArticulo],
    queryFn: async () => {
      if (!origenId) return [];
      const endpoint =
        tipoArticulo === "consumible"
          ? `/api/consumibles?agenciaId=${origenId}`
          : tipoArticulo === "ups"
          ? `/api/ups?agenciaId=${origenId}`
          : `/api/impresoras?agenciaId=${origenId}`;
      const res = await fetch(endpoint);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: modalOpen && Boolean(origenId),
  });

  // Mutación de transferencia
  const transferMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/transferencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al procesar la transferencia");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Transferencia completada: stock restado en origen y sumado en destino");
      queryClient.invalidateQueries({ queryKey: ["transferencias"] });
      queryClient.invalidateQueries({ queryKey: ["consumibles"] });
      queryClient.invalidateQueries({ queryKey: ["ups"] });
      queryClient.invalidateQueries({ queryKey: ["impresoras"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["articulos-origen"] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al transferir");
    },
  });

  const openCreateModal = () => {
    const primerOrigen = agencias[0]?.id || "";
    const primerDestino = agencias.find((a: any) => a.id !== primerOrigen)?.id || "";
    setOrigenId(primerOrigen);
    setDestinoId(primerDestino);
    setTipoArticulo("consumible");
    setArticuloId("");
    setDescripcion("");
    setCantidad(1);
    setMaxStock(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSeleccionarArticulo = (selectedId: string) => {
    setArticuloId(selectedId);
    if (!selectedId) {
      setDescripcion("");
      setMaxStock(null);
      return;
    }

    const item = articulosOrigen.find((a: any) => String(a.id) === String(selectedId));
    if (item) {
      if (tipoArticulo === "consumible") {
        setDescripcion(`${item.tipo_consumible} - ${item.modelo_relacionado}`);
        setMaxStock(item.cantidad_disponible);
        setCantidad(1);
      } else if (tipoArticulo === "ups") {
        setDescripcion(`UPS ${item.marca} ${item.modelo} (${item.capacidad_va} VA)`);
        setMaxStock(item.cantidad);
        setCantidad(1);
      } else if (tipoArticulo === "impresora") {
        setDescripcion(`Impresora ${item.marca} ${item.modelo}`);
        setMaxStock(item.cantidad);
        setCantidad(1);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origenId || !destinoId || (!articuloId && !descripcion.trim()) || !cantidad) {
      toast.error("Complete todos los campos del formulario");
      return;
    }

    if (origenId === destinoId) {
      toast.error("La agencia de origen y destino no pueden ser iguales");
      return;
    }

    if (maxStock !== null && cantidad > maxStock) {
      toast.error(`La cantidad no puede superar el stock disponible (${maxStock})`);
      return;
    }

    transferMutation.mutate({
      agencia_origen_id: Number(origenId),
      agencia_destino_id: Number(destinoId),
      tipo_articulo: tipoArticulo,
      articulo_id: articuloId ? Number(articuloId) : undefined,
      descripcion: descripcion.trim(),
      cantidad: Number(cantidad),
    });
  };

  const filtered = transferencias.filter((t) => {
    const term = search.toLowerCase();
    return (
      t.descripcion.toLowerCase().includes(term) ||
      t.origenNombre.toLowerCase().includes(term) ||
      t.destinoNombre.toLowerCase().includes(term) ||
      t.usuario.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" />
            Transferencias entre Agencias
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reasignación de recursos entre agencias con descuento y aumento automático de stock
          </p>
        </div>

        {esAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-md text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ejecutar Nueva Transferencia</span>
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-2xs flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por artículo, origen, destino o usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Tabla de Transferencias */}
      <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Origen</th>
                <th className="px-6 py-3">Destino</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Artículo Transferido</th>
                <th className="px-6 py-3 text-center">Cantidad</th>
                <th className="px-6 py-3">Registrado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando historial de transferencias...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No se registran transferencias con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(t.fecha)}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      <span className="text-red-500 mr-1 font-bold">-</span>
                      {t.origenNombre}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      <span className="text-emerald-500 mr-1 font-bold">+</span>
                      {t.destinoNombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                          t.tipo_articulo === "consumible"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : t.tipo_articulo === "ups"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                        }`}
                      >
                        {t.tipo_articulo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-foreground font-medium">{t.descripcion}</td>
                    <td className="px-6 py-4 text-center font-bold text-foreground">
                      {t.cantidad}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {t.usuario}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Transferencia Inteligente */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              Nueva Transferencia entre Agencias
            </h2>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                Actualización Automática de Inventario
              </p>
              <p>
                Al confirmar, el stock se descontará inmediatamente de la agencia de origen y se incrementará en la agencia de destino.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Agencia Origen (Resta) *
                  </label>
                  <select
                    value={origenId}
                    onChange={(e) => {
                      setOrigenId(e.target.value);
                      setArticuloId("");
                      setDescripcion("");
                      setMaxStock(null);
                    }}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">Seleccione origen...</option>
                    {agencias.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Agencia Destino (Suma) *
                  </label>
                  <select
                    value={destinoId}
                    onChange={(e) => setDestinoId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">Seleccione destino...</option>
                    {agencias
                      .filter((a: any) => String(a.id) !== String(origenId))
                      .map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Tipo de Artículo *
                  </label>
                  <select
                    value={tipoArticulo}
                    onChange={(e) => {
                      setTipoArticulo(e.target.value as any);
                      setArticuloId("");
                      setDescripcion("");
                      setMaxStock(null);
                    }}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="consumible">Consumible (Tinta / Tóner)</option>
                    <option value="ups">UPS</option>
                    <option value="impresora">Impresora</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Cantidad a Transferir * {maxStock !== null && <span className="text-primary font-bold">(Máx: {maxStock})</span>}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxStock !== null && maxStock > 0 ? maxStock : undefined}
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Selector de artículo existente en la agencia origen */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Seleccionar Artículo en Origen *</span>
                  {cargandoArticulos && <span className="text-xs text-muted-foreground">Cargando inventario...</span>}
                </label>
                
                {origenId ? (
                  <select
                    value={articuloId}
                    onChange={(e) => handleSeleccionarArticulo(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary mb-2"
                    required
                  >
                    <option value="">-- Seleccionar del inventario de la agencia origen --</option>
                    {articulosOrigen.map((art: any) => {
                      const disponible =
                        tipoArticulo === "consumible"
                          ? art.cantidad_disponible
                          : art.cantidad;
                      const etiqueta =
                        tipoArticulo === "consumible"
                          ? `${art.tipo_consumible}: ${art.modelo_relacionado} (Stock disponible: ${disponible})`
                          : tipoArticulo === "ups"
                          ? `UPS ${art.marca} ${art.modelo} ${art.capacidad_va} VA (Disponibles: ${disponible})`
                          : `Impresora ${art.marca} ${art.modelo} (Disponibles: ${disponible})`;
                      return (
                        <option key={art.id} value={art.id} disabled={disponible <= 0}>
                          {etiqueta} {disponible <= 0 ? "— Sin stock" : ""}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-1">
                    Seleccione primero la agencia de origen para ver los artículos disponibles.
                  </p>
                )}

                {/* Resumen del artículo seleccionado */}
                {descripcion && (
                  <div className="p-2.5 bg-muted/40 rounded-md border border-border text-xs text-foreground flex items-center justify-between">
                    <span className="font-medium truncate">{descripcion}</span>
                    {maxStock !== null && (
                      <span className={`font-semibold shrink-0 px-2 py-0.5 rounded text-2xs ${maxStock > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-800"}`}>
                        Stock disponible: {maxStock}
                      </span>
                    )}
                  </div>
                )}
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
                  disabled={transferMutation.isPending || (maxStock !== null && maxStock <= 0)}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-primary hover:bg-primary-600 text-white transition-colors cursor-pointer disabled:opacity-60"
                >
                  {transferMutation.isPending ? "Procesando..." : "Confirmar Transferencia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
