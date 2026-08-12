import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database.types";

export type CurrentStore = Tables<"stores">;

/**
 * The signed-in owner's store, or null if they haven't finished onboarding.
 *
 * A plain unfiltered select is enough — the "owner reads own store" RLS
 * policy (owner_user_id = auth.uid()) already scopes this to at most one row.
 */
export async function getCurrentStore(): Promise<CurrentStore | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("stores").select("*").maybeSingle();
  return data ?? null;
}

/** Same as getCurrentStore, but sends a not-yet-onboarded owner to create one. */
export async function requireCurrentStore(): Promise<CurrentStore> {
  const store = await getCurrentStore();
  if (!store) redirect("/admin/onboarding");
  return store;
}
