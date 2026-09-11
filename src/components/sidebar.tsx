"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Printer,
  Package,
  Zap,
  SlidersHorizontal,
  ArrowRightLeft,
  ShoppingCart,
  FileSpreadsheet,
  History,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Agencias", href: "/agencias", icon: Building2 },
  { name: "Impresoras", href: "/impresoras", icon: Printer },
  { name: "Consumibles", href: "/consumibles", icon: Package },
  { name: "UPS", href: "/ups", icon: Zap },
  { name: "Reglas de Equipos", href: "/reglas", icon: SlidersHorizontal },
  { name: "Transferencias", href: "/transferencias", icon: ArrowRightLeft },
  { name: "Compras Adicionales", href: "/compras-adicionales", icon: ShoppingCart },
  { name: "Reportes y Compras", href: "/reportes", icon: FileSpreadsheet },
  { name: "Bitácora de Auditoría", href: "/auditoria", icon: History },
  { name: "Gestión de Usuarios", href: "/usuarios", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 border-b border-border flex items-center px-6 gap-3 bg-card">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold shadow-sm">
          M
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm tracking-tight text-foreground">
            Gestión IT Central
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            Impresoras, UPS & Stock
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Módulos del Sistema
        </div>

        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-white" : "text-muted-foreground group-hover:text-primary"
                )}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border bg-muted/40 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium text-foreground">Sistema Protegido</span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Control de Acceso y Auditoría
        </div>
      </div>
    </aside>
  );
}
