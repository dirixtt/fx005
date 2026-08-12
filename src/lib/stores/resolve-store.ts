import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PublicStore = { id: string; slug: string; name: string; tagline: string | null };

/**
 * Resolves a storefront route's `[store]` slug to the store it names, or
 * 404s. Reads `store_public` (an anon-readable view of `stores` that omits
 * `owner_user_id`/`owner_telegram_user_id`) rather than `stores` itself —
 * this runs on every storefront page view, unauthenticated.
 */
export async function resolveStore(slug: string): Promise<PublicStore> {
  const supabase = await createClient();
  const { data } = await supabase.from("store_public").select("id, slug, name, tagline").eq("slug", slug).maybeSingle();
  if (!data) notFound();

  // store_public is a view, so its generated types mark every column nullable
  // even though id/slug/name are NOT NULL on the underlying stores table —
  // only tagline genuinely can be null.
  return { id: data.id!, slug: data.slug!, name: data.name!, tagline: data.tagline };
}
