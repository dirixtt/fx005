import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/client";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("is_active", true)
    .eq("show_on_storefront", true);

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map((product) => ({
    url: `${siteUrl}/products/${product.slug}`,
    lastModified: product.updated_at,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...productEntries,
  ];
}
