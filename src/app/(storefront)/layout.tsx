import Link from "next/link";
import { Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CartProvider } from "@/lib/cart-context";
import { CartLink } from "@/components/storefront/cart-link";
import { StorefrontSearch } from "@/components/storefront/storefront-search";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <div className="bg-ink-950 py-1.5 text-center text-xs font-medium text-brand-200">
          Инструменты и электротовары в наличии — самовывоз и доставка по городу
        </div>

        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3.5">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
                <Wrench className="h-4.5 w-4.5" strokeWidth={2.5} />
              </span>
              <span className="text-lg font-bold tracking-tight text-ink-900">fx005</span>
            </Link>

            <div className="flex-1">
              <StorefrontSearch />
            </div>

            <CartLink />
          </div>

          {categories && categories.length > 0 && (
            <nav className="border-t border-neutral-100">
              <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 text-sm">
                <Link
                  href="/"
                  className="shrink-0 rounded-full px-3 py-1 font-medium text-neutral-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  Все товары
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/?category=${c.id}`}
                    className="shrink-0 rounded-full px-3 py-1 font-medium text-neutral-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </nav>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-neutral-200 bg-white py-8">
          <div className="mx-auto max-w-6xl px-4 text-sm text-neutral-500">
            <p className="font-semibold text-neutral-800">fx005</p>
            <p className="mt-1">Розничный магазин инструментов и электротоваров.</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
