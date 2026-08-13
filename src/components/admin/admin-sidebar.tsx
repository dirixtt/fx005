"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DatabaseBackup, LogOut, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { signOut } from "@/lib/actions/auth";
import { LogoMark } from "@/components/brand/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/admin-nav";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

function SidebarContent({ storeName, onNavigate }: { storeName: string; onNavigate?: () => void }) {
  const t = useTranslations("common");

  return (
    <>
      <div className="flex items-center gap-2.5 px-4 py-[22px]">
        <LogoMark className="h-[30px] w-[30px] shrink-0" />
        <p className="truncate text-[15px] font-bold text-white">{storeName}</p>
      </div>
      <AdminNav onNavigate={onNavigate} />
      <div className="space-y-3 p-3 pt-3 border-t border-white/8">
        <div className="flex items-center gap-2 px-1">
          <LocaleToggle className="border-white/12 bg-white/5 text-white hover:bg-white/10" />
          <ThemeToggle className="border-white/12 bg-white/5 text-white hover:bg-white/10" />
        </div>
        <div className="space-y-1">
          <a
            href="/admin/backup/export"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-full justify-start gap-2.5 text-neutral-400 hover:bg-white/8 hover:text-white",
            )}
          >
            <DatabaseBackup className="h-4 w-4" /> {t("backup")}
          </a>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2.5 text-neutral-400 hover:bg-white/8 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> {t("logout")}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}

const SIDEBAR_GLASS = {
  background: "rgba(15,14,17,0.72)",
  backdropFilter: "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
};

export function AdminSidebar({ storeName }: { storeName: string }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("common");

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-divider bg-header-bg px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <LogoMark className="h-8 w-8 shrink-0" />
          <p className="truncate text-sm font-bold text-fg-primary">{storeName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <LocaleToggle />
          <ThemeToggle />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="icon" aria-label={t("logout")}>
              <LogOut className="h-5 w-5" />
            </Button>
          </form>
          <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={t("openMenu")}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden w-[250px] shrink-0 flex-col border-r border-white/8 md:flex"
        style={SIDEBAR_GLASS}
      >
        <SidebarContent storeName={storeName} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col md:hidden"
              style={SIDEBAR_GLASS}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-3 text-neutral-400 hover:bg-white/8 hover:text-white"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
              >
                <X className="h-5 w-5" />
              </Button>
              <SidebarContent storeName={storeName} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
