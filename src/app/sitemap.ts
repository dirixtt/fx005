import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const supabase = createClient();

  const { data: stores } = await supabase.from("store_public").select("slug");
  const storeSlugs = (stores ?? []).map((s) => s.slug).filter((slug): slug is string => Boolean(slug));

  const storeEntries: MetadataRoute.Sitemap = storeSlugs.map((slug) => ({
    url: `${siteUrl}/s/${slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Product listing needs the store on the same query as its variants — done
  // per store rather than one global query, since two stores' products no
  // longer share a single flat table scope worth fetching together.
  const productEntries: MetadataRoute.Sitemap = (
    await Promise.all(
      storeSlugs.map(async (slug) => {
        const { data: store } = await supabase.from("store_public").select("id").eq("slug", slug).maybeSingle();
        if (!store?.id) return [];
        const { data: products } = await supabase
          .from("products")
          .select("slug, updated_at")
          .eq("store_id", store.id)
          .eq("is_active", true)
          .eq("show_on_storefront", true);
        return (products ?? []).map((product) => ({
          url: `${siteUrl}/s/${slug}/products/${product.slug}`,
          lastModified: product.updated_at,
          changeFrequency: "daily" as const,
          priority: 0.7,
        }));
      }),
    )
  ).flat();

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...storeEntries,
    ...productEntries,
  ];
}
