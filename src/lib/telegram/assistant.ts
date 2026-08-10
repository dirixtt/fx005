import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { classifyIntent, type Intent, type IntentLanguage, type ShopInfoTopic } from "@/lib/telegram/intent";
import { replyToCustomer, notifySeller, downloadPhoto } from "@/lib/telegram/client";
import { parseContact } from "@/lib/telegram/contact";
import {
  availableSizes,
  findVariantBySize,
  resolveProduct,
  resolveProductByAttributes,
  type CatalogProduct,
  type ProductResolution,
} from "@/lib/telegram/catalog";
import * as t from "@/lib/telegram/templates";
import { effectiveLanguage, loadAssistantSettings, withSignature, type AssistantSettings } from "@/lib/telegram/settings";
import { describePhoto } from "@/lib/telegram/vision";
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

/** Bundles what every branch needs so functions stop passing three things at once. */
type Ctx = {
  supabase: Client;
  message: InboundMessage;
  settings: AssistantSettings;
};

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
  /** Empty for a photo sent with no caption — see handleInboundMessage. */
  text: string;
  /** The Telegram account name, used when a customer sends a phone with no name. */
  senderName: string | null;
  /** The largest available size of an attached photo, if any. */
  photoFileId: string | null;
};

export async function handleInboundMessage(message: InboundMessage): Promise<void> {
  const supabase = createServiceRoleClient();
  const settings = await loadAssistantSettings(supabase);

  // The master switch. Checked before anything else touches the network — a
  // seller who turned the bot off gets a bot that spends no model calls and
  // sends no messages, not one that quietly keeps working in the background.
  if (!settings.enabled) return;

  const ctx: Ctx = { supabase, message, settings };

  const { data: chat } = await supabase
    .from("telegram_chats")
    .select("chat_id, state, draft, last_product_id, customer_phone")
    .eq("chat_id", message.chatId)
    .maybeSingle();

  // A customer who was asked a follow-up question is answering that question, not
  // starting a new one. Classifying "Азиз, +998901234567" or a bare phone number
  // would waste a model call to be told it is `other`, and drop the answer.
  if (chat?.state === "awaiting_contact" && chat.draft) {
    await completeOrder(ctx, chat.draft as unknown as Draft);
    return;
  }
  if (chat?.state === "awaiting_phone_for_status") {
    const language = (chat.draft as unknown as StatusDraft | null)?.language ?? "ru";
    await answerOrderStatusFromText(ctx, language, message.text);
    return;
  }

  // A photo with no caption has no words for classifyIntent to read, but it is
  // still exactly a stock question about whatever is in the picture — so it is
  // treated as one, with everything left for the photo pipeline in dispatch()
  // to fill in. Text always wins when both are present: a caption is a customer
  // choosing to say something specific, and classifyIntent should read it.
  const rawIntent = message.text
    ? await classifyIntent(message.text, { extraInstructions: settings.extraInstructions })
    : message.photoFileId && settings.canMatchPhotos
      ? ({ kind: "check_availability", language: "ru", product: null, size: null, color: null } as const)
      : null;

  // Neither text nor a photo the bot is allowed to look at — nothing to do,
  // the same silence a sticker or voice note has always gotten.
  if (!rawIntent) return;

  await supabase
    .from("telegram_messages")
    .update({ intent: rawIntent.kind, intent_data: rawIntent as never })
    .eq("id", message.messageId);

  // Applied once, right after classification, so every branch below sees the
  // language the seller wants used — not the one the classifier merely detected.
  const intent = { ...rawIntent, language: effectiveLanguage(settings, rawIntent.language) } as Intent;

  await dispatch(ctx, intent, chat?.last_product_id ?? null, chat?.customer_phone ?? null);
}

async function dispatch(
  ctx: Ctx,
  intent: Intent,
  lastProductId: string | null,
  knownPhone: string | null,
): Promise<void> {
  // Greetings, complaints, and anything the classifier was unsure of. The seller
  // handles these; the bot has nothing useful to add and every attempt would be
  // a guess.
  if (intent.kind === "other") return;

  // Each capability gates its intent the same way an unrecognised message would:
  // silence, and a line on the seller's unanswered list. There is deliberately no
  // separate "I can't help with that" template — a disabled capability and a
  // genuinely unclear message should look identical to the seller, who handles
  // both by hand either way.
  if (intent.kind === "check_availability" && !ctx.settings.canAnswerAvailability) return;
  if (intent.kind === "ask_price" && !ctx.settings.canAnswerPrice) return;
  if (intent.kind === "place_order" && !ctx.settings.canPlaceOrders) return;
  if (intent.kind === "check_order_status" && !ctx.settings.canAnswerOrderStatus) return;
  if (intent.kind === "ask_shop_info" && !ctx.settings.canAnswerShopInfo) return;

  // These two are about the shop, not a product — resolving a product first
  // would be wasted work at best and a wrong "which product?" prompt at worst.
  if (intent.kind === "check_order_status") {
    if (knownPhone) {
      await lookupOrderStatus(ctx, intent.language, knownPhone);
    } else {
      await ctx.supabase.from("telegram_chats").upsert(
        {
          chat_id: ctx.message.chatId,
          business_connection_id: ctx.message.businessConnectionId,
          state: "awaiting_phone_for_status",
          draft: { language: intent.language } as never,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "chat_id" },
      );
      await reply(ctx, t.askPhoneForStatusReply(intent.language));
    }
    return;
  }
  if (intent.kind === "ask_shop_info") {
    await answerShopInfo(ctx, intent.language, intent.topic);
    return;
  }

  let resolution = await resolveProduct(ctx.supabase, {
    query: intent.product,
    lastProductId,
  });

  // Words found nothing — if a photo came with this message and the seller has
  // turned photo matching on, that photo is the only other signal there is.
  // Falls straight into the same resolved/ambiguous/unknown handling below, so
  // a photo match is answered exactly like a text match: same templates, same
  // "remember this product" bookkeeping, no separate code path to keep in sync.
  if (resolution.status === "unknown" && ctx.message.photoFileId && ctx.settings.canMatchPhotos) {
    resolution = await resolveFromPhoto(ctx.supabase, ctx.message.photoFileId);
  }

  if (resolution.status === "unknown") {
    // They asked a real question about a product we cannot identify. Answering
    // "which product?" here would be reasonable, but the honest reading is that
    // the catalogue does not have what they named — and only a human can say so.
    return;
  }

  if (resolution.status === "ambiguous") {
    await reply(ctx, t.whichProductReply(intent.language, resolution.products.map((p) => p.name)));
    return;
  }

  const product = resolution.product;
  // Remember it before answering: even a "we don't have that size" reply is
  // context the next message will need.
  await rememberProduct(ctx, product.id);

  switch (intent.kind) {
    case "check_availability":
      await answerAvailability(ctx, intent.language, product, intent.size);
      return;
    case "ask_price":
      await answerPrice(ctx, intent.language, product);
      return;
    case "place_order":
      await startOrder(ctx, intent.language, product, intent.size, intent.quantity);
      return;
  }
}

/**
 * Downloads a customer's photo, describes it, and searches the catalogue for
 * it — or returns `unknown` at the first place any of that fails.
 *
 * Every failure here is silent by design, same as everywhere else: a photo
 * that will not download, a vision call that errors out, a category too vague
 * to search on, a search that finds nothing. None of them are worth telling
 * the customer "I don't understand your photo" — the seller sees the photo
 * themselves in /admin/telegram and answers it directly.
 */
async function resolveFromPhoto(supabase: Client, fileId: string): Promise<ProductResolution> {
  const photo = await downloadPhoto(fileId);
  if (!photo) return { status: "unknown" };

  const attributes = await describePhoto(photo.base64, photo.mediaType);
  if (!attributes) return { status: "unknown" };

  return resolveProductByAttributes(supabase, attributes);
}

async function answerAvailability(
  ctx: Ctx,
  language: IntentLanguage,
  product: CatalogProduct,
  size: string | null,
): Promise<void> {
  const available = inStock(product.variants);

  if (size) {
    const variant = findVariantBySize(product.variants, size);
    if (variant && variant.stock_quantity > 0) {
      await reply(ctx, t.inStockReply(language, product.name, variant.size, variant.sale_price));
    } else {
      // Covers both "that size does not exist" and "it exists but is gone". The
      // customer's next question is the same either way: what *do* you have.
      await reply(ctx, t.outOfSizeReply(language, product.name, size, availableSizes(product.variants)));
    }
    return;
  }

  if (available.length === 0) {
    await reply(ctx, t.soldOutReply(language, product.name));
    return;
  }

  const sizes = availableSizes(product.variants);
  if (sizes.length > 0) {
    await reply(ctx, t.sizesReply(language, product.name, sizes));
    return;
  }

  // A product with no sizes at all — a bag, a belt, or anything the seller
  // entered as a single variant. "In stock" is the complete answer.
  await reply(ctx, t.inStockReply(language, product.name, null, available[0].sale_price));
}

async function answerPrice(ctx: Ctx, language: IntentLanguage, product: CatalogProduct): Promise<void> {
  const range = priceRange(product.variants);
  if (!range) {
    // No variants at all — a half-entered product. Nothing truthful to quote.
    await reply(ctx, t.soldOutReply(language, product.name));
    return;
  }

  await reply(ctx, t.priceReply(language, product.name, range.min, range.max));
}

async function startOrder(
  ctx: Ctx,
  language: IntentLanguage,
  product: CatalogProduct,
  size: string | null,
  quantity: number,
): Promise<void> {
  const available = inStock(product.variants);

  if (available.length === 0) {
    await reply(ctx, t.soldOutReply(language, product.name));
    return;
  }

  let variant = size ? findVariantBySize(product.variants, size) : null;

  if (size && (!variant || variant.stock_quantity <= 0)) {
    await reply(ctx, t.outOfSizeReply(language, product.name, size, availableSizes(product.variants)));
    return;
  }

  if (!variant) {
    // No size given. One option left means there is nothing to ask about;
    // several means asking is the only honest move.
    if (available.length === 1) {
      variant = available[0];
    } else {
      await reply(ctx, t.whichSizeReply(language, product.name, availableSizes(product.variants)));
      return;
    }
  }

  if (variant.stock_quantity < quantity) {
    await reply(ctx, t.outOfSizeReply(language, product.name, variantLabel(variant), availableSizes(product.variants)));
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
  await ctx.supabase.from("telegram_chats").upsert(
    {
      chat_id: ctx.message.chatId,
      business_connection_id: ctx.message.businessConnectionId,
      state: "awaiting_contact",
      draft: draft as never,
      last_product_id: product.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "chat_id" },
  );

  await reply(ctx, t.askContactReply(language, product.name, variant.size, variant.sale_price * quantity));
}

/**
 * Reads a phone number out of free text and answers with that number's order
 * history, or asks again if the text had no recognisable number.
 *
 * Used both when the customer types a number in response to
 * `askPhoneForStatusReply` and — indirectly, via `lookupOrderStatus` — when the
 * phone is already on file and no parsing is needed at all.
 */
async function answerOrderStatusFromText(ctx: Ctx, language: IntentLanguage, text: string): Promise<void> {
  const phone = parseContact(text).phone;
  if (!phone) {
    // State is left as 'awaiting_phone_for_status'. This is the one place a
    // wrong guess would be actively harmful — reading a stray number as the
    // phone would tell a stranger about someone else's order.
    await reply(ctx, t.phoneUnclearForStatusReply(language));
    return;
  }
  await lookupOrderStatus(ctx, language, phone);
}

async function lookupOrderStatus(ctx: Ctx, language: IntentLanguage, phone: string): Promise<void> {
  const { data: orders, error } = await ctx.supabase.rpc("recent_orders_by_phone", { p_phone: phone });

  // Remembered regardless of whether anything was found: a wrong number typed
  // once should not be re-asked on every later question, and the seller can
  // always see the raw text in /admin/telegram if it needs correcting.
  await ctx.supabase
    .from("telegram_chats")
    .upsert(
      {
        chat_id: ctx.message.chatId,
        business_connection_id: ctx.message.businessConnectionId,
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
    await reply(ctx, t.noOrdersFoundReply(language));
    return;
  }

  await reply(ctx, t.orderStatusReply(language, orders));
}

async function answerShopInfo(ctx: Ctx, language: IntentLanguage, topic: ShopInfoTopic): Promise<void> {
  if (topic === "delivery") {
    const { data: zones } = await ctx.supabase
      .from("delivery_zones")
      .select("name, price, eta_days")
      .order("sort_order");

    // No zones configured — the honest reading is that this has not been set up
    // yet, not that delivery costs nothing.
    if (!zones || zones.length === 0) return;
    await reply(ctx, t.deliveryReply(language, zones));
    return;
  }

  const { data: info } = await ctx.supabase.from("shop_info").select("payment_text, hours_text").maybeSingle();
  const text = topic === "payment" ? info?.payment_text : info?.hours_text;
  if (!text) return;
  await reply(ctx, t.shopTextReply(text));
}

async function completeOrder(ctx: Ctx, draft: Draft): Promise<void> {
  const contact = parseContact(ctx.message.text);

  if (!contact.phone) {
    // The draft is kept. They are mid-purchase; making them start over because
    // they typed their name first is how a sale is lost to friction.
    await reply(ctx, t.contactUnclearReply(draft.language));
    return;
  }

  // Telegram already knows what the account is called. Using it beats refusing an
  // order over a missing field the customer thought was obvious.
  const name = contact.name ?? ctx.message.senderName;
  if (!name) {
    await reply(ctx, t.contactUnclearReply(draft.language));
    return;
  }

  const { data: orderId, error } = await ctx.supabase.rpc("create_telegram_order", {
    p_variant_id: draft.variant_id,
    p_quantity: draft.quantity,
    p_customer_name: name,
    p_customer_phone: contact.phone,
    p_address: contact.address ?? undefined,
    p_chat_id: ctx.message.chatId,
  });

  if (error || !orderId) {
    // Almost always the last item selling while the customer typed. The chat is
    // released so they are not stuck answering a question that no longer applies.
    console.error("[assistant] create_telegram_order failed", error?.message);
    await releaseChat(ctx.supabase, ctx.message.chatId);
    await reply(ctx, t.orderFailedReply(draft.language));
    await notifySeller(
      `⚠️ Не удалось оформить заявку из Telegram\n${draft.product_name}` +
        `${draft.size ? `, ${draft.size}` : ""}\n${name} — ${contact.phone}\n\n` +
        `Причина: ${error?.message ?? "неизвестна"}`,
    );
    return;
  }

  const total = draft.unit_price * draft.quantity;
  await reply(ctx, t.orderCreatedReply(draft.language, draft.product_name, draft.size, total));

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

async function rememberProduct(ctx: Ctx, productId: string) {
  await ctx.supabase.from("telegram_chats").upsert(
    {
      chat_id: ctx.message.chatId,
      business_connection_id: ctx.message.businessConnectionId,
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
async function reply(ctx: Ctx, text: string): Promise<void> {
  const signed = withSignature(ctx.settings, text);
  const result = await replyToCustomer(ctx.message.chatId, signed, ctx.message.businessConnectionId);

  if (!result.ok) {
    // Not logged as outbound: nothing was delivered, so the conversation really is
    // still unanswered and should stay on the seller's list.
    console.error("[assistant] reply failed", ctx.message.chatId, result.error);
    return;
  }

  await ctx.supabase.from("telegram_messages").upsert(
    {
      business_connection_id: ctx.message.businessConnectionId,
      chat_id: ctx.message.chatId,
      telegram_user_id: null,
      telegram_message_id: result.messageId,
      direction: "out",
      text: signed,
      raw: { source: "assistant" } as never,
    },
    // Telegram echoes our own sends back through the webhook; whichever write
    // lands second is a no-op rather than an error.
    { onConflict: "chat_id,telegram_message_id", ignoreDuplicates: true },
  );
}
