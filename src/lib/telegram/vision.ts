import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Reading a customer's photo — "у вас есть такое?" with no words at all.
 *
 * Same boundary as intent.ts, extended to images: the model never names a
 * product and never decides what matches. It picks tags from a fixed,
 * closed vocabulary — a category and zero or more colours — and the code turns
 * those tags into a catalogue search. A model that can only say "this looks
 * like a black jacket" cannot promise a specific item is in stock; it has never
 * seen the catalogue and has no channel to a customer.
 *
 * This is deliberately the least confident capability in the system
 * (`can_match_photos` defaults off) — a customer's own photo of a competitor's
 * product is a request this pipeline will, correctly, find nothing for.
 */

const MODEL = "claude-opus-5";

export const CATEGORIES = [
  "jacket",
  "hoodie",
  "t_shirt",
  "shirt",
  "jeans",
  "pants",
  "dress",
  "skirt",
  "sneakers",
  "shoes",
  "boots",
  "bag",
  "hat",
  "other",
] as const;
export type PhotoCategory = (typeof CATEGORIES)[number];

export const COLORS = [
  "black",
  "white",
  "red",
  "blue",
  "green",
  "yellow",
  "pink",
  "gray",
  "brown",
  "beige",
  "orange",
  "purple",
  "multicolor",
] as const;
export type PhotoColor = (typeof COLORS)[number];

export type PhotoAttributes = { category: PhotoCategory; colors: PhotoColor[] };

const DESCRIBE_TOOL: Anthropic.Tool = {
  name: "describe_item",
  description:
    "Call this once you have looked at the photo. Report only what kind of " +
    "clothing or accessory it is and its colour(s), from the fixed lists given. " +
    "Never guess a brand, a specific product, or anything not in the lists.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: [...CATEGORIES],
        description: "The single closest category. Use 'other' rather than forcing a bad fit.",
      },
      colors: {
        type: "array",
        items: { type: "string", enum: [...COLORS] },
        description: "One or two dominant colours. Empty array if the photo is unclear.",
      },
    },
    required: ["category", "colors"],
    additionalProperties: false,
  },
};

const SYSTEM_PROMPT = `Ты смотришь на фото, которое клиент прислал продавцу одежды и обуви. Твоя единственная задача — вызвать функцию describe_item с категорией и цветом из заданных списков.

Ты не называешь бренд, модель или конкретный товар — ты их не знаешь, у тебя нет доступа к каталогу магазина. Ты описываешь только то, что видно на фото: тип вещи и цвет.

Если на фото не одежда и не обувь, или непонятно что это — выбирай category: "other".`;

const attributesSchema = z.object({
  category: z.enum(CATEGORIES),
  colors: z.array(z.enum(COLORS)).max(3),
});

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client = new Anthropic({ maxRetries: 1, timeout: 15_000 });
  return client;
}

export type DescribeOptions = {
  /** Overridable so tests can inject a stub without touching the network. */
  client?: Anthropic;
};

/**
 * Describes a photo's category and colour, or returns null on any failure —
 * missing key, network error, refusal, a category outside the closed list, or
 * "other" with no colours (too little signal to search on).
 *
 * Never throws. A null here means the same thing `otherIntent` means in
 * intent.ts: stay silent, let the seller see the photo themselves.
 */
export async function describePhoto(
  base64: string,
  mediaType: "image/jpeg",
  options: DescribeOptions = {},
): Promise<PhotoAttributes | null> {
  const anthropic = options.client ?? getClient();
  if (!anthropic) {
    console.error("[vision] ANTHROPIC_API_KEY is not configured — falling back to the seller");
    return null;
  }

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: { effort: "low" },
      tools: [DESCRIBE_TOOL],
      tool_choice: { type: "any", disable_parallel_tool_use: true },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "Опиши, что на фото." },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("[vision] describePhoto failed", error);
    return null;
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) return null;

  const parsed = attributesSchema.safeParse(toolUse.input);
  if (!parsed.success) return null;

  // "other" with nothing else to go on cannot be turned into a search — the
  // honest outcome is the same silence as any other unrecognised message.
  if (parsed.data.category === "other" && parsed.data.colors.length === 0) return null;

  return parsed.data;
}
