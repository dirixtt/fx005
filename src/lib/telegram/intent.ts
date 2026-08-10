import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Step 3 — intent recognition.
 *
 * The model's ONLY job here is to pick one of four functions and fill in what the
 * customer literally said. It never sees the catalogue and never writes a word to
 * the customer: stock levels and prices are read from the database in Step 4 and
 * poured into fixed templates. That separation is the whole point — a model that
 * cannot see stock cannot invent it.
 *
 * Everything degrades to `other`, which means "say nothing, hand the chat to the
 * seller". A missing API key, a rate limit, a malformed argument object — all of
 * them end in silence plus a nudge to a human, never in a guess.
 */

const MODEL = "claude-opus-5";

/** Russian, or Uzbek in either script. Decides which reply template Step 4 uses. */
export type IntentLanguage = "ru" | "uz";

/** Why we ended up at `other` — for the seller's notification and for logs. */
export type OtherReason =
  /** The model looked at the message and genuinely classified it as small talk. */
  | "classified"
  /** Photo, sticker or voice note with no words in it. */
  | "no_text"
  /** The model answered without calling a function. */
  | "no_tool_call"
  /** The function call came back with arguments we could not read. */
  | "invalid_arguments"
  /** No API key, network failure, rate limit, timeout. */
  | "unavailable";

/** Which non-catalogue question the customer asked. Decides which template answers it. */
export type ShopInfoTopic = "delivery" | "payment" | "hours";

export type Intent =
  | {
      kind: "check_availability";
      language: IntentLanguage;
      product: string | null;
      size: string | null;
      color: string | null;
    }
  | { kind: "ask_price"; language: IntentLanguage; product: string | null }
  | {
      kind: "place_order";
      language: IntentLanguage;
      product: string | null;
      size: string | null;
      color: string | null;
      quantity: number;
    }
  | { kind: "check_order_status"; language: IntentLanguage }
  | { kind: "ask_shop_info"; language: IntentLanguage; topic: ShopInfoTopic }
  | { kind: "other"; language: IntentLanguage; reason: OtherReason; note: string | null };

export function otherIntent(reason: OtherReason, note: string | null = null): Intent {
  // Russian is the safer default for a message we could not read: the seller
  // reads this note, not the customer, and every seller here reads Russian.
  return { kind: "other", language: "ru", reason, note };
}

// --- Tool definitions -------------------------------------------------------
//
// `strict: true` guarantees the argument object matches the schema, and every
// optional value is spelled `["string", "null"]` rather than left out of
// `required`. A field the model must always emit — even as null — is a field it
// answers deliberately; a field it may omit is one it quietly invents.

const nullableString = (description: string) => ({
  anyOf: [{ type: "string" as const }, { type: "null" as const }],
  description,
});

const LANGUAGE_PROPERTY = {
  type: "string" as const,
  enum: ["ru", "uz"],
  description:
    "Language the customer is writing in: 'ru' for Russian, 'uz' for Uzbek in " +
    "either Latin or Cyrillic script. Judge by the words, not the alphabet — " +
    "'нархи қанча' is Uzbek written in Cyrillic.",
};

const PRODUCT_PROPERTY = nullableString(
  "The product the customer means, copied from their own words — a name " +
    "('бомбер', 'krossovka'), an article or SKU number if they quoted one, or a " +
    "reference to a photo ('это', 'shu'). Null when they named nothing at all. " +
    "Never invent a product name.",
);

const SIZE_PROPERTY = nullableString(
  "The size exactly as written: '42', 'M', '42-44', 'XL'. Do not convert between " +
    "sizing systems and do not guess. Null when no size was mentioned.",
);

const COLOR_PROPERTY = nullableString(
  "The colour exactly as written ('чёрный', 'oq', 'qora'). Null when not mentioned.",
);

export const INTENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "check_availability",
    description:
      "Call this when the customer is asking whether something is in stock, or " +
      "which sizes or colours are left. Typical phrasings: 'есть 42 размер?', " +
      "'42 bormi', 'bor mi shu', 'размеры какие есть', 'qaysi razmerlar bor'. " +
      "Also call it for a bare size or number sent on its own after a product " +
      "photo — '42?' is a stock question. Do NOT answer the question yourself; " +
      "you do not know what is in stock.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        language: LANGUAGE_PROPERTY,
        product: PRODUCT_PROPERTY,
        size: SIZE_PROPERTY,
        color: COLOR_PROPERTY,
      },
      required: ["language", "product", "size", "color"],
      additionalProperties: false,
    },
  },
  {
    name: "ask_price",
    description:
      "Call this when the customer is asking how much something costs, or about " +
      "discounts and delivery cost. Typical phrasings: 'сколько стоит?', 'цена?', " +
      "'narxi qancha', 'нархи қанча', 'qancha turadi', 'почём'. Do NOT state a " +
      "price; you do not know it.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        language: LANGUAGE_PROPERTY,
        product: PRODUCT_PROPERTY,
      },
      required: ["language", "product"],
      additionalProperties: false,
    },
  },
  {
    name: "place_order",
    description:
      "Call this when the customer has decided to buy — not when they are still " +
      "asking. Typical phrasings: 'беру', 'заказываю', 'отправляйте', 'олдим', " +
      "'olaman', '42 ni olaman', 'ikkitasini yuboring'. A question about stock or " +
      "price is NOT an order, even an enthusiastic one.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        language: LANGUAGE_PROPERTY,
        product: PRODUCT_PROPERTY,
        size: SIZE_PROPERTY,
        color: COLOR_PROPERTY,
        quantity: {
          anyOf: [{ type: "integer" as const }, { type: "null" as const }],
          description:
            "How many items, if the customer said so ('ikkita', 'две штуки'). " +
            "Null when they did not — it is then treated as one.",
        },
      },
      required: ["language", "product", "size", "color", "quantity"],
      additionalProperties: false,
    },
  },
  {
    name: "check_order_status",
    description:
      "Call this when the customer is asking about an order they already placed " +
      "— where it is, whether it shipped, whether it was confirmed. Typical " +
      "phrasings: 'где мой заказ', 'buyurtmam qayerda', 'когда доставят', 'заказ " +
      "подтвердили?'. Not for a new purchase — that is place_order.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { language: LANGUAGE_PROPERTY },
      required: ["language"],
      additionalProperties: false,
    },
  },
  {
    name: "ask_shop_info",
    description:
      "Call this for a question about the shop itself rather than a specific " +
      "product: delivery cost and areas ('доставка есть?', 'yetkazib berasizmi', " +
      "'сколько доставка'), how to pay ('как оплата', 'karta orqali to'lasa " +
      "bo'ladimi'), or when the shop is open ('часы работы', 'necha soatda " +
      "ishlaysiz'). Pick the single topic that matches best.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        language: LANGUAGE_PROPERTY,
        topic: {
          type: "string",
          enum: ["delivery", "payment", "hours"],
          description:
            "'delivery' for shipping cost, areas or timing; 'payment' for how to " +
            "pay; 'hours' for when the shop is open or responds.",
        },
      },
      required: ["language", "topic"],
      additionalProperties: false,
    },
  },
  {
    name: "other",
    description:
      "Call this for everything else: greetings ('салом', 'assalomu alaykum'), " +
      "thanks ('rahmat', 'спасибо'), complaints, questions about a previous " +
      "order, anything you are not sure about. This is the safe choice — the " +
      "message goes to the human seller, which is always better than a wrong " +
      "guess. When a message both greets and asks something, do NOT use this: " +
      "classify by the question.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        language: LANGUAGE_PROPERTY,
        note: nullableString(
          "One short phrase in Russian telling the seller what this is about, so " +
            "they can triage without opening the chat. Null if the message speaks " +
            "for itself. This is shown to the seller only, never to the customer.",
        ),
      },
      required: ["language", "note"],
      additionalProperties: false,
    },
  },
];

const SYSTEM_PROMPT = `Ты — классификатор сообщений для интернет-магазина одежды и обуви в Узбекистане. Продавец работает через Telegram, клиенты пишут ему в личку.

Твоя единственная задача — вызвать ровно одну функцию. Ты никогда не пишешь текст в ответ и никогда не общаешься с клиентом.

Ты НЕ ЗНАЕШЬ, что есть в наличии, какие размеры остались и сколько что стоит. Этих данных у тебя нет и не будет. Их достанет из базы другой код и подставит в готовый шаблон. Поэтому любая попытка сказать «да, есть» или назвать цену — это выдумка, а не ответ.

Как пишут клиенты:
- по-русски: «есть 42 размер?», «сколько стоит», «беру», «а чёрный есть»
- по-узбекски латиницей: «42 bormi», «narxi qancha», «olaman», «qora bormi»
- по-узбекски кириллицей: «нархи қанча», «бор ми», «олдим»
- вперемешку, без знаков препинания, с опечатками, часто одним словом

Правила:
1. Копируй размер, цвет и название товара ровно так, как написал клиент. Не переводи, не нормализуй, не додумывай.
2. Если чего-то в сообщении нет — ставь null. Пустое поле честнее выдуманного.
3. Сомневаешься между двумя функциями — выбирай ту, что осторожнее: вопрос о покупке это check_availability или ask_price, а не place_order.
4. Сомневаешься вообще — вызывай other. Сообщение уйдёт живому продавцу. Это всегда лучше, чем ответить наугад.
5. Приветствие вместе с вопросом («салом, 42 борми») — классифицируй по вопросу, а не по приветствию.
6. check_order_status — только про заказ, который уже сделан. Вопрос о новой покупке — это place_order, даже если клиент путает слова.
7. ask_shop_info — про магазин, а не про конкретный товар: доставка, оплата, часы работы.`;

// --- Parsing ----------------------------------------------------------------

// Deliberately strict: `strict: true` on the tool definitions already guarantees
// the shape, so anything that fails here means the model did something we did not
// design for. Coercing that into a plausible-looking intent would hide it; better
// to fall through to `other` and let a human read the message.
const languageSchema = z.enum(["ru", "uz"]);
const nullableStringSchema = z
  .string()
  .trim()
  .nullable()
  // An empty string after trimming is the same as "not mentioned".
  .transform((value) => value || null);

const checkAvailabilitySchema = z.object({
  language: languageSchema,
  product: nullableStringSchema,
  size: nullableStringSchema,
  color: nullableStringSchema,
});

const askPriceSchema = z.object({
  language: languageSchema,
  product: nullableStringSchema,
});

const placeOrderSchema = z.object({
  language: languageSchema,
  product: nullableStringSchema,
  size: nullableStringSchema,
  color: nullableStringSchema,
  // The one lenient field. A customer who says "беру" has decided to buy, and
  // losing that to an odd number is worse than falling back to one item — the
  // seller confirms the count before anything ships anyway.
  quantity: z.number().int().positive().nullable().catch(null),
});

const checkOrderStatusSchema = z.object({
  language: languageSchema,
});

const askShopInfoSchema = z.object({
  language: languageSchema,
  topic: z.enum(["delivery", "payment", "hours"]),
});

const otherSchema = z.object({
  language: languageSchema,
  note: nullableStringSchema,
});

/**
 * Turns a raw tool call into an `Intent`, or into `other` if it cannot.
 *
 * Pure and total: never throws, never reaches the network. This is where the
 * model's output stops being trusted, so it is also the part worth testing
 * without an API key.
 */
export function intentFromToolUse(name: string, input: unknown): Intent {
  switch (name) {
    case "check_availability": {
      const parsed = checkAvailabilitySchema.safeParse(input);
      if (!parsed.success) return otherIntent("invalid_arguments");
      return { kind: "check_availability", ...parsed.data };
    }
    case "ask_price": {
      const parsed = askPriceSchema.safeParse(input);
      if (!parsed.success) return otherIntent("invalid_arguments");
      return { kind: "ask_price", ...parsed.data };
    }
    case "place_order": {
      const parsed = placeOrderSchema.safeParse(input);
      if (!parsed.success) return otherIntent("invalid_arguments");
      // "Beraman" without a number means one item; that is the only assumption
      // made anywhere in this file, and it is the one every seller makes too.
      return { kind: "place_order", ...parsed.data, quantity: parsed.data.quantity ?? 1 };
    }
    case "check_order_status": {
      const parsed = checkOrderStatusSchema.safeParse(input);
      if (!parsed.success) return otherIntent("invalid_arguments");
      return { kind: "check_order_status", ...parsed.data };
    }
    case "ask_shop_info": {
      const parsed = askShopInfoSchema.safeParse(input);
      if (!parsed.success) return otherIntent("invalid_arguments");
      return { kind: "ask_shop_info", ...parsed.data };
    }
    case "other": {
      const parsed = otherSchema.safeParse(input);
      if (!parsed.success) return otherIntent("invalid_arguments");
      return { kind: "other", language: parsed.data.language, reason: "classified", note: parsed.data.note };
    }
    default:
      // A tool name we never defined. Treat it exactly like a broken argument list.
      return otherIntent("invalid_arguments", `неизвестная функция: ${name}`);
  }
}

// --- Classification ---------------------------------------------------------

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) return null;

  client = new Anthropic({
    // A customer is waiting on the other side of this call. One retry, then give
    // up and let the seller answer — a reply that arrives two minutes late is
    // worse than no reply at all.
    maxRetries: 1,
    timeout: 15_000,
  });
  return client;
}

export type ClassifyOptions = {
  /** Overridable so tests can inject a stub without touching the network. */
  client?: Anthropic;
  signal?: AbortSignal;
};

/**
 * Classifies one customer message.
 *
 * Never throws. Every failure path returns `other`, which Step 4 reads as
 * "stay silent and notify the seller".
 */
export async function classifyIntent(text: string | null, options: ClassifyOptions = {}): Promise<Intent> {
  const trimmed = text?.trim();
  if (!trimmed) return otherIntent("no_text");

  const anthropic = options.client ?? getClient();
  if (!anthropic) {
    console.error("[intent] ANTHROPIC_API_KEY is not configured — falling back to the seller");
    return otherIntent("unavailable", "ассистент не настроен");
  }

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        // Classification is a single judgement call, not a chain of reasoning,
        // and a customer is waiting.
        output_config: { effort: "low" },
        tools: INTENT_TOOLS,
        // Force exactly one call: no free text can come back, and the model
        // cannot hedge by calling two functions at once.
        tool_choice: { type: "any", disable_parallel_tool_use: true },
        messages: [{ role: "user", content: trimmed }],
      },
      { signal: options.signal },
    );
  } catch (error) {
    console.error("[intent] classification failed", error);
    return otherIntent("unavailable");
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUse) {
    console.warn("[intent] model returned no tool call", response.stop_reason);
    return otherIntent("no_tool_call");
  }

  return intentFromToolUse(toolUse.name, toolUse.input);
}
