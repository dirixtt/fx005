import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { classifyIntent, type Intent, type IntentLanguage, type ShopInfoTopic } from "@/lib/telegram/intent";
import { replyToCustomer, notifySeller } from "@/lib/telegram/client";
import { parseContact } from "@/lib/telegram/contact";
import {
  availableSizes,
  findVariantBySize,
  resolveProduct,
  type CatalogProduct,
} from "@/lib/telegram/catalog";
import * as t from "@/lib/telegram/templates";
import { inStock, priceRange, variantLabel } from "@/lib/variants";
import { formatMoney } from "@/lib/utils";

/**
 * The assistant loop: read one customer message, decide, answer or stay quiet.
 *
 * The shape of every branch below is the same — look something up in Postgres,
 * pick a template, fill it in — and where a lookup comes back ambiguous or empty
 * the branch ends in silence. Silence is a real answer here: the conversation
 * stays on the seller's unanswered list (Step 6) and a human picks it up. The one
 * thing that never happens is the bot filling a gap with something plausible.
 */

type Client = SupabaseClient<Database>;

/** The pending order, held on the chat row while we ask for a name and phone. */
type Draft = {
  variant_id: string;
  quantity: number;
  language: IntentLanguage;
  product_name: string;
  size: string | null;
  unit_price: number;
};

/** What `draft` holds while state = 'awaiting_phone_for_status'. */
type StatusDraft = { language: IntentLanguage };

export type InboundMessage = {
  /** telegram_messages.id of the row just written for this message. */
  messageId: string;
  chatId: number;
  businessConnectionId: string | null;
  text: string;
  /** The Telegram account name, used when a customer sends a phone with no name. */
  senderName: string | null;
};

export async function handleInboundMessage(message: InboundMessage): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: chat } = await supabase
    .from("telegram_chats")
    .select("chat_id, state, draft, last_product_id, customer_phone")
    .eq("chat_id", message.chatId)
    .maybeSingle();

  // A customer who was asked a follow-up question is answering that question, not
  // starting a new one. Classifying "Азиз, +998901234567" or a bare phone number
  // would waste a model call to be told it is `other`, and drop the answer.
  if (chat?.state === "awaiting_contact" && chat.draft) {
    await completeOrder(supabase, message, chat.draft as unknown as Draft);
    return;
  }
  if (chat?.state === "awaiting_phone_for_status") {
    const language = (chat.draft as unknown as StatusDraft | null)?.language ?? "ru";
    await answerOrderStatusFromText(supabase, message, language, message.text);
    return;
  }

  const intent = await classifyIntent(message.text);
  await supabase
    .from("telegram_messages")
    .update({ intent: intent.kind, intent_data: intent as never })
    .eq("id", message.messageId);

  await dispatch(supabase, message, intent, chat?.last_product_id ?? null, chat?.customer_phone ?? null);
}

async function dispatch(
  supabase: Client,
  message: InboundMessage,
  intent: Intent,
  lastProductId: string | null,
  knownPhone: string | null,
): Promise<void> {
  // Greetings, complaints, and anything the classifier was unsure of. The seller
  // handles these; the bot has nothing useful to add and every attempt would be
  // a guess.
  if (intent.kind === "other") return;

  // These two are about the shop, not a product — resolving a product first
  // would be wasted work at best and a wrong "which product?" prompt at worst.
  if (intent.kind === "check_order_status") {
    if (knownPhone) {
      await lookupOrderStatus(supabase, message, intent.language, knownPhone);
    } else {
      await supabase.from("telegram_chats").upsert(
        {
          chat_id: message.chatId,
          business_connection_id: message.businessConnectionId,
          state: "awaiting_phone_for_status",
          draft: { language: intent.language } as never,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "chat_id" },
      );
      await reply(supabase, message, t.askPhoneForStatusReply(intent.language));
    }
    return;
  }
  if (intent.kind === "ask_shop_info") {
    await answerShopInfo(supabase, message, intent.language, intent.topic);
    return;
  }

  const resolution = await resolveProduct(supabase, {
    query: intent.product,
    lastProductId,
  });

  if (resolution.status === "unknown") {
    // They asked a real question about a product we cannot identify. Answering
    // "which product?" here would be reasonable, but the honest reading is that
    // the catalogue does not have what they named — and only a human can say so.
    return;
  }

  if (resolution.status === "ambiguous") {
    await reply(supabase, message, t.whichProductReply(intent.language, resolution.products.map((p) => p.name)));
    return;
  }

  const product = resolution.product;
  // Remember it before answering: even a "we don't have that size" reply is
  // context the next message will need.
  await rememberProduct(supabase, message, product.id);

  switch (intent.kind) {
    case "check_availability":
      await answerAvailability(supabase, message, intent.language, product, intent.size);
      return;
    case "ask_price":
      await answerPrice(supabase, message, intent.language, product);
      return;
    case "place_order":
      await startOrder(supabase, message, intent.language, product, intent.size, intent.quantity);
      return;
  }
}

async function answerAvailability(
  supabase: Client,
  message: InboundMessage,
  language: IntentLanguage,
  product: CatalogProduct,
  size: string | null,
): Promise<void> {
  const available = inStock(product.variants);

  if (size) {
    const variant = findVariantBySize(product.variants, size);
    if (variant && variant.stock_quantity > 0) {
      await reply(supabase, message, t.inStockReply(language, product.name, variant.size, variant.sale_price));
    } else {
      // Covers both "that size does not exist" and "it exists but is gone". The
      // customer's next question is the same either way: what *do* you have.
      await reply(supabase, message, t.outOfSizeReply(language, product.name, size, availableSizes(product.variants)));
    }
    return;
  }

  if (available.length === 0) {
    await reply(supabase, message, t.soldOutReply(language, product.name));
    return;
  }

  const sizes = availableSizes(product.variants);
  if (sizes.length > 0) {
    await reply(supabase, message, t.sizesReply(language, product.name, sizes));
    return;
  }

  // A product with no sizes at all — a bag, a belt, or anything the seller
  // entered as a single variant. "In stock" is the complete answer.
  await reply(supabase, message, t.inStockReply(language, product.name, null, available[0].sale_price));
}

async function answerPrice(
  supabase: Client,
  message: InboundMessage,
  language: IntentLanguage,
  product: CatalogProduct,
): Promise<void> {
  const range = priceRange(product.variants);
  if (!range) {
    // No variants at all — a half-entered product. Nothing truthful to quote.
    await reply(supabase, message, t.soldOutReply(language, product.name));
    return;
  }

  await reply(supabase, message, t.priceReply(language, product.name, range.min, range.max));
}

async function startOrder(
  supabase: Client,
  message: InboundMessage,
  language: IntentLanguage,
  product: CatalogProduct,
  size: string | null,
  quantity: number,
): Promise<void> {
  const available = inStock(product.variants);

  if (available.length === 0) {
    await reply(supabase, message, t.soldOutReply(language, product.name));
    return;
  }

  let variant = size ? findVariantBySize(product.variants, size) : null;

  if (size && (!variant || variant.stock_quantity <= 0)) {
    await reply(supabase, message, t.outOfSizeReply(language, product.name, size, availableSizes(product.variants)));
    return;
  }

  if (!variant) {
    // No size given. One option left means there is nothing to ask about;
    // several means asking is the only honest move.
    if (available.length === 1) {
      variant = available[0];
    } else {
      await reply(supabase, message, t.whichSizeReply(language, product.name, availableSizes(product.variants)));
      return;
    }
  }

  if (variant.stock_quantity < quantity) {
    await reply(supabase, message, t.outOfSizeReply(language, product.name, variantLabel(variant), availableSizes(product.variants)));
    return;
  }

  const draft: Draft = {
    variant_id: variant.id,
    quantity,
    language,
    product_name: product.name,
    size: variant.size,
    unit_price: variant.sale_price,
  };

  // Nothing is reserved yet. Stock moves only when the phone number arrives, so
  // an abandoned conversation costs nothing.
  await supabase.from("telegram_chats").upsert(
    {
      chat_id: message.chatId,
      business_connection_id: message.businessConnectionId,
      state: "awaiting_contact",
      draft: draft as never,
      last_product_id: product.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "chat_id" },
  );

  await reply(
    supabase,
    message,
    t.askContactReply(language, product.name, variant.size, variant.sale_price * quantity),
  );
}

/**
 * Reads a phone number out of free text and answers with that number's order
 * history, or asks again if the text had no recognisable number.
 *
 * Used both when the customer types a number in response to
 * `askPhoneForStatusReply` and — indirectly, via `lookupOrderStatus` — when the
 * phone is already on file and no parsing is needed at all.
 */
async function answerOrderStatusFromText(
  supabase: Client,
  message: InboundMessage,
  language: IntentLanguage,
  text: string,
): Promise<void> {
  const phone = parseContact(text).phone;
  if (!phone) {
    // State is left as 'awaiting_phone_for_status'. This is the one place a
    // wrong guess would be actively harmful — reading a stray number as the
    // phone would tell a stranger about someone else's order.
    await reply(supabase, message, t.phoneUnclearForStatusReply(language));
    return;
  }
  await lookupOrderStatus(supabase, message, language, phone);
}

async function lookupOrderStatus(
  supabase: Client,
  message: InboundMessage,
  language: IntentLanguage,
  phone: string,
): Promise<void> {
  const { data: orders, error } = await supabase.rpc("recent_orders_by_phone", { p_phone: phone });

  // Remembered regardless of whether anything was found: a wrong number typed
  // once should not be re-asked on every later question, and the seller can
  // always see the raw text in /admin/telegram if it needs correcting.
  await supabase
    .from("telegram_chats")
    .upsert(
      {
        chat_id: message.chatId,
        business_connection_id: message.businessConnectionId,
        state: "idle",
        draft: null,
        customer_phone: phone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "chat_id" },
    );

  if (error) {
    console.error("[assistant] recent_orders_by_phone failed", error.message);
    return;
  }

  if (!orders || orders.length === 0) {
    await reply(supabase, message, t.noOrdersFoundReply(language));
    return;
  }

  await reply(supabase, message, t.orderStatusReply(language, orders));
}

async function answerShopInfo(
  supabase: Client,
  message: InboundMessage,
  language: IntentLanguage,
  topic: ShopInfoTopic,
): Promise<void> {
  if (topic === "delivery") {
    const { data: zones } = await supabase
      .from("delivery_zones")
      .select("name, price, eta_days")
      .order("sort_order");

    // No zones configured — the honest reading is that this has not been set up
    // yet, not that delivery costs nothing.
    if (!zones || zones.length === 0) return;
    await reply(supabase, message, t.deliveryReply(language, zones));
    return;
  }

  const { data: info } = await supabase.from("shop_info").select("payment_text, hours_text").maybeSingle();
  const text = topic === "payment" ? info?.payment_text : info?.hours_text;
  if (!text) return;
  await reply(supabase, message, t.shopTextReply(text));
}

async function completeOrder(
  supabase: Client,
  message: InboundMessage,
  draft: Draft,
): Promise<void> {
  const contact = parseContact(message.text);

  if (!contact.phone) {
    // The draft is kept. They are mid-purchase; making them start over because
    // they typed their name first is how a sale is lost to friction.
    await reply(supabase, message, t.contactUnclearReply(draft.language));
    return;
  }

  // Telegram already knows what the account is called. Using it beats refusing an
  // order over a missing field the customer thought was obvious.
  const name = contact.name ?? message.senderName;
  if (!name) {
    await reply(supabase, message, t.contactUnclearReply(draft.language));
    return;
  }

  const { data: orderId, error } = await supabase.rpc("create_telegram_order", {
    p_variant_id: draft.variant_id,
    p_quantity: draft.quantity,
    p_customer_name: name,
    p_customer_phone: contact.phone,
    p_address: contact.address ?? undefined,
    p_chat_id: message.chatId,
  });

  if (error || !orderId) {
    // Almost always the last item selling while the customer typed. The chat is
    // released so they are not stuck answering a question that no longer applies.
    console.error("[assistant] create_telegram_order failed", error?.message);
    await releaseChat(supabase, message.chatId);
    await reply(supabase, message, t.orderFailedReply(draft.language));
    await notifySeller(
      `⚠️ Не удалось оформить заявку из Telegram\n${draft.product_name}` +
        `${draft.size ? `, ${draft.size}` : ""}\n${name} — ${contact.phone}\n\n` +
        `Причина: ${error?.message ?? "неизвестна"}`,
    );
    return;
  }

  const total = draft.unit_price * draft.quantity;
  await reply(supabase, message, t.orderCreatedReply(draft.language, draft.product_name, draft.size, total));

  // The seller is told immediately, not in the nightly digest: someone is waiting
  // for a call.
  await notifySeller(
    `🛒 Новая заявка из Telegram\n\n` +
      `${draft.product_name}${draft.size ? `, ${draft.size}` : ""} × ${draft.quantity}\n` +
      `${formatMoney(total)}\n\n` +
      `${name}\n${contact.phone}${contact.address ? `\n${contact.address}` : ""}`,
  );
}

// --- Shared plumbing --------------------------------------------------------

async function rememberProduct(supabase: Client, message: InboundMessage, productId: string) {
  await supabase.from("telegram_chats").upsert(
    {
      chat_id: message.chatId,
      business_connection_id: message.businessConnectionId,
      last_product_id: productId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "chat_id" },
  );
}

async function releaseChat(supabase: Client, chatId: number) {
  await supabase
    .from("telegram_chats")
    .update({ state: "idle", draft: null, updated_at: new Date().toISOString() })
    .eq("chat_id", chatId);
}

/**
 * Sends a reply and writes it to the message log.
 *
 * The logging is not bookkeeping — it is what makes the Step 6 reminder correct.
 * That query asks "is the newest message in this chat from the customer?", so a
 * reply the bot sent but never recorded would leave an answered conversation
 * nagging the seller forever.
 */
async function reply(supabase: Client, message: InboundMessage, text: string): Promise<void> {
  const result = await replyToCustomer(message.chatId, text, message.businessConnectionId);

  if (!result.ok) {
    // Not logged as outbound: nothing was delivered, so the conversation really is
    // still unanswered and should stay on the seller's list.
    console.error("[assistant] reply failed", message.chatId, result.error);
    return;
  }

  await supabase.from("telegram_messages").upsert(
    {
      business_connection_id: message.businessConnectionId,
      chat_id: message.chatId,
      telegram_user_id: null,
      telegram_message_id: result.messageId,
      direction: "out",
      text,
      raw: { source: "assistant" } as never,
    },
    // Telegram echoes our own sends back through the webhook; whichever write
    // lands second is a no-op rather than an error.
    { onConflict: "chat_id,telegram_message_id", ignoreDuplicates: true },
  );
}
