import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 md:flex-row">
      <AdminSidebar />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
