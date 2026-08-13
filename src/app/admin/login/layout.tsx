import type { Metadata } from "next";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed right-4 top-4 z-10 flex items-center gap-2">
        <LocaleToggle />
        <ThemeToggle />
      </div>
      {children}
    </>
  );
}
