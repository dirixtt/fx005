import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

/**
 * Supabase client that bypasses Row Level Security.
 *
 * Only the Telegram webhook uses this. Inbound customer messages have to be
 * written by a caller nobody is signed in as, and the alternative — a
 * SECURITY DEFINER insert reachable with the public anon key — would let anyone
 * holding that key forge customer conversations.
 *
 * Never import this into a Client Component or anything reachable from the
 * browser bundle: the key it reads grants full access to every table.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for the Telegram webhook",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
