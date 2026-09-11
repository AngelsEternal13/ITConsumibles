"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  Eye,
  ArrowRight,
  Database,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AuditoriaItem {
  id: number;
  usuario: string;
  accion: "CREATE" | "UPDATE" | "DELETE" | "TRANSFER";
  tabla: string;
  registro_id: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  fecha: string;
}

export default function AuditoriaPage() {
  const [search, setSearch] = useState("");
  const [filterAccion, setFilterAccion] = useState("todas");
  const [filterTabla, setFilterTabla] = useState("todas");
  const [detalleItem, setDetalleItem] = useState<AuditoriaItem | null>(null);

  const { data: logs = [], isLoading } = useQuery<AuditoriaItem[]>({
    queryKey: ["auditoria"],
    queryFn: async () => {
      const res = await fetch("/api/auditoria");
      if (!res.ok) throw new Error("Error obteniendo auditoría");
      return res.json();
    },
  });

  const tablas = Array.from(new Set(logs.map((l) => l.tabla))).filter(Boolean);

  const filtered = logs.filter((item) => {
    const term = search.toLowerCase();
    const matchesSearch =
      item.usuario.toLowerCase().includes(term) ||
      item.tabla.toLowerCase().includes(term) ||
      (item.registro_id && item.registro_id.toLowerCase().includes(term));
    const matchesAccion = filterAccion === "todas" || item.accion === filterAccion;
    const matchesTabla = filterTabla === "todas" || item.tabla === filterTabla;
    return matchesSearch && matchesAccion && matchesTabla;
  });

  const renderJsonPretty = (jsonString: string | null) => {
    if (!jsonString) return <span className="text-muted-foreground italic">N/A</span>;
    try {
      const parsed = JSON.parse(jsonString);
      return (
        <pre className="text-xs bg-muted/60 p-3 rounded-md overflow-x-auto font-mono text-foreground">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return <span className="text-xs font-mono">{jsonString}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Bitácora de Auditoría y Trazabilidad
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro inmutable de todas las operaciones realizadas (CREATE, UPDATE, DELETE, TRANSFER)
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por usuario, tabla o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={filterAccion}
            onChange={(e) => setFilterAccion(e.target.value)}
            className="px-3 py-2 text-xs rounded-md bg-background border border-border text-foreground focus:outline-hidden"
          >
            <option value="todas">Todas las Acciones</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="TRANSFER">TRANSFER</option>
          </select>

          <select
            value={filterTabla}
            onChange={(e) => setFilterTabla(e.target.value)}
            className="px-3 py-2 text-xs rounded-md bg-background border border-border text-foreground focus:outline-hidden"
          >
            <option value="todas">Todas las Tablas</option>
            {tablas.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Auditoría */}
      <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3.5">Fecha y Hora</th>
                <th className="px-6 py-3.5">Usuario</th>
                <th className="px-6 py-3.5">Acción</th>
                <th className="px-6 py-3.5">Módulo / Tabla</th>
                <th className="px-6 py-3.5">ID Registro</th>
                <th className="px-6 py-3.5 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando bitácora de auditoría...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(item.fecha)}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-foreground">
                      {item.usuario}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.accion === "CREATE"
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                            : item.accion === "UPDATE"
                            ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                            : item.accion === "DELETE"
                            ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                            : "bg-purple-500/15 text-purple-600 border border-purple-500/30"
                        }`}
                      >
                        {item.accion}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground uppercase">
                      {item.tabla}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-foreground">
                      {item.registro_id || "-"}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => setDetalleItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>Ver Valores</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de Auditoría */}
      {detalleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Detalle del Evento de Auditoría #{detalleItem.id}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ejecutado por {detalleItem.usuario} el {formatDate(detalleItem.fecha)}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-muted font-mono font-bold text-xs">
                {detalleItem.accion} en {detalleItem.tabla}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Valor Anterior (Antes del cambio)
                </h3>
                {renderJsonPretty(detalleItem.valor_anterior)}
              </div>

              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Valor Nuevo (Registrado)
                </h3>
                {renderJsonPretty(detalleItem.valor_nuevo)}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                onClick={() => setDetalleItem(null)}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-primary hover:bg-primary-600 text-white transition-colors cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
