"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LinkCodeState = { code: string; expiresAt: string } | { error: string } | undefined;

const PATH = "/admin/settings/telegram";
const CODE_LIFETIME_MS = 10 * 60 * 1000;

function randomCode(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

/**
 * Issues a one-time code the seller sends to the bot (in a plain, non-Business
 * chat) to prove which Telegram account is theirs — see the webhook route's
 * handleLinkAttempt for the other half of this flow.
 *
 * Retries on a code collision rather than checking uniqueness up front: the
 * table enforces it, and a collision is rare enough that racing the database
 * is simpler than a separate existence check.
 */
export async function generateTelegramLinkCode(): Promise<LinkCodeState> {
  const supabase = await createClient();

  const { data: storeId, error: storeError } = await supabase.rpc("auth_store_id");
  if (storeError || !storeId) {
    return { error: "Магазин не найден. Завершите настройку магазина, прежде чем подключать Telegram." };
  }

  const expiresAt = new Date(Date.now() + CODE_LIFETIME_MS).toISOString();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { error } = await supabase
      .from("telegram_link_codes")
      .insert({ store_id: storeId, code, expires_at: expiresAt });

    if (!error) {
      revalidatePath(PATH);
      return { code, expiresAt };
    }
    // 23505 = unique_violation — the only expected failure here, and only on
    // the `code` column; anything else is a real error worth surfacing.
    if (error.code !== "23505") {
      return { error: error.message };
    }
  }

  return { error: "Не получилось сгенерировать код, попробуйте ещё раз." };
}
