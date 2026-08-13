"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export type CreateStoreState = { error: string } | undefined;

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "cart",
  "checkout",
  "s",
  "login",
  "onboarding",
  "order-confirmation",
  "products",
  "sitemap.xml",
  "robots.txt",
]);

export async function createStore(_prevState: CreateStoreState, formData: FormData): Promise<CreateStoreState> {
  const t = await getTranslations("onboarding");
  const name = String(formData.get("name") || "").trim();
  const rawSlug = String(formData.get("slug") || "").trim();

  if (!name) return { error: t("errorNameRequired") };

  const slug = slugify(rawSlug || name).slice(0, 40);
  if (slug.length < 2) return { error: t("errorSlugTooShort") };
  if (RESERVED_SLUGS.has(slug)) return { error: t("errorSlugReserved") };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_store", { p_name: name, p_slug: slug });

  if (error) {
    // 23505 = unique_violation on stores.slug — the one failure a seller can
    // actually fix themselves by trying a different address.
    if (error.code === "23505") {
      return { error: t("errorSlugTaken") };
    }
    return { error: error.message };
  }

  redirect("/admin");
}
