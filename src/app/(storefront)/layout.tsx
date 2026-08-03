import Link from "next/link";
import { CartProvider } from "@/lib/cart-context";
import { CartLink } from "@/components/storefront/cart-link";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-white">
        <header className="border-b border-neutral-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold text-neutral-900">
              fx005
            </Link>
            <CartLink />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </CartProvider>
  );
}
