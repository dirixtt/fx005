"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  ScanBarcode,
  Boxes,
  Users,
  ClipboardList,
  BarChart3,
  MessagesSquare,
  Settings,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/admin/pos", labelKey: "pos", icon: ScanBarcode },
  { href: "/admin/inventory", labelKey: "inventory", icon: Boxes },
  { href: "/admin/customers", labelKey: "customers", icon: Users },
  { href: "/admin/orders", labelKey: "orders", icon: ClipboardList },
  { href: "/admin/telegram", labelKey: "telegram", icon: MessagesSquare },
  { href: "/admin/settings/telegram", labelKey: "settingsTelegram", icon: Link2 },
  { href: "/admin/settings/assistant", labelKey: "settingsAssistant", icon: Settings },
  { href: "/admin/reports", labelKey: "reports", icon: BarChart3 },
] as const;

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

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
                className="absolute inset-0 rounded-lg"
                style={{ background: "var(--accent-orange-grad)" }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className="relative z-10 h-4 w-4" strokeWidth={2} />
            <span className="relative z-10">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
