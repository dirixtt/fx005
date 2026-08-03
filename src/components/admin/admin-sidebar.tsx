"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DatabaseBackup, LogOut, Menu, Wrench, X } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/admin-nav";
import { cn } from "@/lib/utils";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Wrench className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <p className="text-sm font-bold text-white">fx005 админ</p>
      </div>
      <AdminNav onNavigate={onNavigate} />
      <div className="space-y-1 p-3">
        <a
          href="/admin/backup/export"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full justify-start gap-2.5 text-neutral-400 hover:bg-white/5 hover:text-white",
          )}
        >
          <DatabaseBackup className="h-4 w-4" /> Резервная копия
        </a>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Выйти
          </Button>
        </form>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Wrench className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <p className="text-sm font-bold text-neutral-900">fx005 админ</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Открыть меню">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col bg-ink-950 md:flex">
        <SidebarContent />
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
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink-950 md:hidden"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-3 text-neutral-400 hover:bg-white/5 hover:text-white"
                onClick={() => setOpen(false)}
                aria-label="Закрыть меню"
              >
                <X className="h-5 w-5" />
              </Button>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
