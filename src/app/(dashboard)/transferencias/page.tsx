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

  // Form states
  const [origenId, setOrigenId] = useState<number | string>("");
  const [destinoId, setDestinoId] = useState<number | string>("");
  const [tipoArticulo, setTipoArticulo] = useState<"consumible" | "ups" | "impresora">("consumible");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState(1);

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

  // Transfer mutation
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
    onSuccess: () => {
      toast.success("Transferencia procesada y stocks actualizados automáticamente");
      queryClient.invalidateQueries({ queryKey: ["transferencias"] });
      queryClient.invalidateQueries({ queryKey: ["consumibles"] });
      queryClient.invalidateQueries({ queryKey: ["ups"] });
      queryClient.invalidateQueries({ queryKey: ["impresoras"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al transferir");
    },
  });

  const openCreateModal = () => {
    setOrigenId(agencias[0]?.id || "");
    setDestinoId(agencias[1]?.id || "");
    setTipoArticulo("consumible");
    setDescripcion("");
    setCantidad(1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origenId || !destinoId || !descripcion.trim() || !cantidad) {
      toast.error("Complete todos los campos del formulario");
      return;
    }

    if (origenId === destinoId) {
      toast.error("La agencia de origen y destino no pueden ser iguales");
      return;
    }

    transferMutation.mutate({
      agencia_origen_id: Number(origenId),
      agencia_destino_id: Number(destinoId),
      tipo_articulo: tipoArticulo,
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
                <th className="px-6 py-3.5">Fecha y Hora</th>
                <th className="px-6 py-3.5">Agencia Origen</th>
                <th className="px-6 py-3.5 text-center"></th>
                <th className="px-6 py-3.5">Agencia Destino</th>
                <th className="px-6 py-3.5">Tipo</th>
                <th className="px-6 py-3.5">Artículo / Modelo</th>
                <th className="px-6 py-3.5 text-center">Cantidad</th>
                <th className="px-6 py-3.5">Usuario Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando bitácora de transferencias...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No se han registrado transferencias aún.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(t.fecha)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-foreground">
                      {t.origenNombre}
                    </td>
                    <td className="px-2 py-3.5 text-center text-muted-foreground">
                      <ArrowRight className="w-4 h-4 inline text-primary" />
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-foreground">
                      {t.destinoNombre}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
                        {t.tipo_articulo}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-foreground">
                      {t.descripcion}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-block px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-sm">
                        {t.cantidad}
                      </span>
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

      {/* Modal de Transferencia */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              Nueva Transferencia entre Agencias
            </h2>
            <p className="text-xs text-muted-foreground">
              El stock se descontará de la agencia de origen y se incrementará en la agencia de destino en tiempo real.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Agencia Origen *
                  </label>
                  <select
                    value={origenId}
                    onChange={(e) => setOrigenId(e.target.value)}
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
                    Agencia Destino *
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
                    onChange={(e) => setTipoArticulo(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="consumible">Consumible (Tinta / Tóner)</option>
                    <option value="ups">UPS</option>
                    <option value="impresora">Impresora</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Cantidad a Transferir *
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

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Descripción o Modelo del Artículo *
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Tintas L3250, Tóner HP 107W, UPS 750 VA..."
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  required
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
                  disabled={transferMutation.isPending}
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
