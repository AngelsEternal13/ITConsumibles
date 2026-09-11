"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Eye,
  KeyRound,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface UsuarioItem {
  id: number;
  nombre: string;
  usuario: string | null;
  correo: string;
  rol: "admin" | "lector";
  fecha_creacion: string;
}

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const esAdmin = session?.user?.role === "admin";

  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("todos");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioItem | null>(null);

  // Form Fields
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<"admin" | "lector">("lector");

  // Queries
  const { data: usuarios = [], isLoading } = useQuery<UsuarioItem[]>({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const res = await fetch("/api/usuarios");
      if (!res.ok) throw new Error("Error al obtener usuarios");
      return res.json();
    },
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const method = payload.id ? "PUT" : "POST";
      const res = await fetch("/api/usuarios", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar usuario");
      return data;
    },
    onSuccess: () => {
      toast.success(editingUser ? "Usuario actualizado correctamente" : "Usuario creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Error al guardar usuario"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/usuarios?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar usuario");
      return data;
    },
    onSuccess: () => {
      toast.success("Usuario eliminado");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (err: any) => toast.error(err.message || "No se pudo eliminar"),
  });

  // Handlers
  const openCreateModal = () => {
    setEditingUser(null);
    setNombre("");
    setUsuario("");
    setCorreo("");
    setPassword("");
    setRol("lector");
    setModalOpen(true);
  };

  const openEditModal = (u: UsuarioItem) => {
    setEditingUser(u);
    setNombre(u.nombre);
    setUsuario(u.usuario || "");
    setCorreo(u.correo);
    setPassword(""); // Blank unless changed
    setRol(u.rol);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!editingUser && !password) {
      toast.error("La contraseña es obligatoria para nuevos usuarios");
      return;
    }

    saveMutation.mutate({
      id: editingUser?.id,
      nombre: nombre.trim(),
      usuario: usuario.trim() || nombre.toLowerCase().replace(/\s+/g, ""),
      correo: correo.trim() || undefined,
      password: password ? password.trim() : undefined,
      rol,
    });
  };

  const handleDelete = (u: UsuarioItem) => {
    if (u.usuario === "admin" || u.id === 1) {
      toast.error("No se puede eliminar la cuenta principal del sistema");
      return;
    }
    if (confirm(`¿Está seguro de eliminar al usuario ${u.nombre} (${u.usuario || u.correo})?`)) {
      deleteMutation.mutate(u.id);
    }
  };

  // Filtering
  const filteredUsuarios = usuarios.filter((u) => {
    const matchesSearch =
      u.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (u.usuario && u.usuario.toLowerCase().includes(search.toLowerCase())) ||
      u.correo.toLowerCase().includes(search.toLowerCase());

    const matchesRol = filterRol === "todos" || u.rol === filterRol;

    return matchesSearch && matchesRol;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Gestión de Usuarios y Accesos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administración de cuentas con usuario, contraseña y permisos del sistema
          </p>
        </div>

        {esAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-md text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Nuevo Usuario</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, usuario o correo..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            <option value="todos">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="lector">Lector</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-6 py-3.5">Nombre</th>
                <th className="px-6 py-3.5">Nombre de Usuario</th>
                <th className="px-6 py-3.5">Correo Electrónico</th>
                <th className="px-6 py-3.5 text-center">Rol en Sistema</th>
                <th className="px-6 py-3.5">Fecha de Registro</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-foreground flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {u.nombre.charAt(0)}
                      </div>
                      <span>{u.nombre}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-xs bg-muted px-2.5 py-1 rounded-md font-semibold text-foreground">
                        {u.usuario || u.correo.split("@")[0]}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground">{u.correo}</td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.rol === "admin"
                            ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {u.rol === "admin" ? (
                          <>
                            <Shield className="w-3 h-3" />
                            <span>Administrador</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Lector</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {formatDate(u.fecha_creacion)}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      {esAdmin ? (
                        <>
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                            title="Editar Usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={u.usuario === "admin" || u.id === 1}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Eliminar Usuario"
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

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              {editingUser ? "Editar Usuario" : "Agregar Nuevo Usuario"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => {
                      setNombre(e.target.value);
                      if (!editingUser && !usuario) {
                        setUsuario(e.target.value.toLowerCase().replace(/\s+/g, ""));
                      }
                    }}
                    placeholder="Ej: Carlos Gómez"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Usuario *
                  </label>
                  <input
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    placeholder="ej: cgomez"
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Rol *
                  </label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value as "admin" | "lector")}
                    className="w-full px-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="admin">Administrador</option>
                    <option value="lector">Lector</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Correo Electrónico (opcional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="ej: cgomez@empresa.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {editingUser ? "Nueva Contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? "••••••••" : "Mínimo 4 caracteres"}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-background rounded-md border border-border focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required={!editingUser}
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
                  {saveMutation.isPending ? "Guardando..." : editingUser ? "Actualizar Usuario" : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
