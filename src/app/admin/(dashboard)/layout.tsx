import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireCurrentStore } from "@/lib/stores/current-store";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Every page under here assumes a store exists — an owner who hasn't
  // finished onboarding is sent there instead of hitting RLS-empty queries
  // on every admin page individually.
  const store = await requireCurrentStore();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 md:flex-row">
      <AdminSidebar storeName={store.name} />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
