"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  ScanBarcode,
  Boxes,
  Users,
  ClipboardList,
  BarChart3,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard },
  { href: "/admin/pos", label: "Касса", icon: ScanBarcode },
  { href: "/admin/inventory", label: "Склад", icon: Boxes },
  { href: "/admin/customers", label: "Клиенты", icon: Users },
  { href: "/admin/orders", label: "Заказы", icon: ClipboardList },
  { href: "/admin/telegram", label: "Диалоги", icon: MessagesSquare },
  { href: "/admin/reports", label: "Отчёты", icon: BarChart3 },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((item) => {
        const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "text-white" : "text-neutral-400 hover:bg-white/5 hover:text-white",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="admin-nav-active"
                className="absolute inset-0 rounded-lg bg-brand-600"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className="relative z-10 h-4 w-4" strokeWidth={2} />
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
