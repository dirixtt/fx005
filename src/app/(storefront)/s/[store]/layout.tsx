import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogoLockup } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { resolveStore } from "@/lib/stores/resolve-store";
import { StoreProvider } from "@/lib/store-context";
import { CartProvider } from "@/lib/cart-context";
import { CartLink } from "@/components/storefront/cart-link";
import { StorefrontSearch } from "@/components/storefront/storefront-search";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ store: string }>;
}): Promise<Metadata> {
  const { store: slug } = await params;
  const store = await resolveStore(slug);
  return {
    title: { default: store.name, template: `%s · ${store.name}` },
    description: store.tagline ?? undefined,
  };
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ store: string }>;
}) {
  const { store: slug } = await params;
  const store = await resolveStore(slug);
  const t = await getTranslations("storefront");

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("store_id", store.id)
    .order("name");

  const base = `/s/${store.slug}`;

  return (
    <StoreProvider store={store}>
      <CartProvider storeSlug={store.slug}>
        <div className="flex min-h-screen flex-col bg-neutral-50">
          {store.tagline && (
            <div className="bg-ink-950 py-1.5 text-center text-xs font-medium text-brand-200">{store.tagline}</div>
          )}

          <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3.5">
              <Link href={base} className="flex min-w-0 shrink items-center gap-2" aria-label={t("homeAriaLabel", { name: store.name })}>
                <LogoLockup className="shrink-0 text-brandnavy" />
                <span className="truncate text-sm font-semibold text-neutral-900">{store.name}</span>
              </Link>

              <div className="min-w-0 flex-1">
                <StorefrontSearch />
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <LocaleToggle />
                <ThemeToggle />
                <CartLink />
              </div>
            </div>

            {categories && categories.length > 0 && (
              <nav className="border-t border-neutral-100">
                <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 text-sm">
                  <Link
                    href={base}
                    className="shrink-0 rounded-full px-3 py-1 font-medium text-neutral-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    {t("allProducts")}
                  </Link>
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={`${base}?category=${c.id}`}
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
              <LogoLockup className="text-brandnavy" />
              <p className="mt-2">{store.name}</p>
            </div>
          </footer>
        </div>
      </CartProvider>
    </StoreProvider>
  );
}
