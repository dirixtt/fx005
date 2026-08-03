import { DatabaseBackup, LogOut, Wrench } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/admin-nav";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="flex w-56 shrink-0 flex-col bg-ink-950">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Wrench className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <p className="text-sm font-bold text-white">fx005 админ</p>
        </div>
        <AdminNav />
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
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
