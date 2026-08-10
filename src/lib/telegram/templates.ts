import type { IntentLanguage } from "@/lib/telegram/intent";
import { formatMoney } from "@/lib/utils";

/**
 * Every sentence the bot is capable of saying to a customer.
 *
 * This file is the enforcement point for the rule the whole design rests on: the
 * model never writes to a customer. It picks an intent; the code picks a template
 * from this list and fills the blanks with numbers read out of Postgres a
 * millisecond earlier. There is no path from model output to customer text.
 *
 * Which means the failure mode is a stiff, repetitive bot — not a bot that
 * cheerfully promises a size that sold out last week. That trade is the product.
 *
 * Uzbek is written in Latin script: it is what people actually type, even those
 * who read Cyrillic comfortably.
 */

type Copy = Record<IntentLanguage, string>;

function pick(language: IntentLanguage, copy: Copy): string {
  return copy[language] ?? copy.ru;
}

export function inStockReply(
  language: IntentLanguage,
  product: string,
  size: string | null,
  price: number,
): string {
  const what = size ? `${product}, ${size}` : product;
  return pick(language, {
    ru: `✅ ${what} — есть в наличии.\nЦена: ${formatMoney(price)}`,
    uz: `✅ ${what} — bor.\nNarxi: ${formatMoney(price)}`,
  });
}

export function outOfSizeReply(
  language: IntentLanguage,
  product: string,
  size: string,
  availableSizes: string[],
): string {
  if (availableSizes.length === 0) {
    return pick(language, {
      ru: `❌ ${product}, ${size} — сейчас нет. Других размеров тоже не осталось.`,
      uz: `❌ ${product}, ${size} — hozir yo'q. Boshqa o'lchamlar ham qolmagan.`,
    });
  }

  const list = availableSizes.join(", ");
  return pick(language, {
    ru: `❌ ${size} — нет.\nЕсть: ${list}`,
    uz: `❌ ${size} — yo'q.\nBor o'lchamlar: ${list}`,
  });
}

export function soldOutReply(language: IntentLanguage, product: string): string {
  return pick(language, {
    ru: `❌ ${product} — сейчас нет в наличии.`,
    uz: `❌ ${product} — hozir yo'q.`,
  });
}

export function sizesReply(
  language: IntentLanguage,
  product: string,
  availableSizes: string[],
): string {
  const list = availableSizes.join(", ");
  return pick(language, {
    ru: `${product} — есть размеры: ${list}`,
    uz: `${product} — mavjud o'lchamlar: ${list}`,
  });
}

export function priceReply(
  language: IntentLanguage,
  product: string,
  min: number,
  max: number,
): string {
  // A range, when sizes are priced differently, is the honest answer. Quoting the
  // cheapest and letting the customer discover the rest at checkout is how a shop
  // loses one.
  const price = min === max ? formatMoney(min) : `${formatMoney(min)} — ${formatMoney(max)}`;
  return pick(language, {
    ru: `${product}\nЦена: ${price}`,
    uz: `${product}\nNarxi: ${price}`,
  });
}

export function whichProductReply(language: IntentLanguage, names: string[]): string {
  const list = names.map((name) => `• ${name}`).join("\n");
  return pick(language, {
    ru: `Уточните, о каком товаре речь:\n${list}`,
    uz: `Qaysi mahsulot haqida ekanini aniqlashtiring:\n${list}`,
  });
}

export function whichSizeReply(
  language: IntentLanguage,
  product: string,
  availableSizes: string[],
): string {
  const list = availableSizes.join(", ");
  return pick(language, {
    ru: `${product} — какой размер? Есть: ${list}`,
    uz: `${product} — qaysi o'lcham kerak? Bor: ${list}`,
  });
}

export function askContactReply(
  language: IntentLanguage,
  product: string,
  size: string | null,
  price: number,
): string {
  const what = size ? `${product}, ${size}` : product;
  return pick(language, {
    ru:
      `Отлично! ${what} — ${formatMoney(price)}.\n\n` +
      `Напишите одним сообщением имя, телефон и район, и продавец свяжется с вами.\n` +
      `Например: Азиз, +998 90 123 45 67, Юнусабад`,
    uz:
      `Zo'r! ${what} — ${formatMoney(price)}.\n\n` +
      `Ism, telefon raqam va tumaningizni bitta xabarda yozing, sotuvchi siz bilan bog'lanadi.\n` +
      `Masalan: Aziz, +998 90 123 45 67, Yunusobod`,
  });
}

export function contactUnclearReply(language: IntentLanguage): string {
  // Only ever sent when the phone number could not be read. The district is
  // optional, so a message missing it is accepted rather than bounced back.
  return pick(language, {
    ru: "Не разобрал номер. Напишите, пожалуйста, имя и телефон — например: Азиз, +998 90 123 45 67",
    uz: "Raqamni tushunmadim. Iltimos, ism va telefon yozing — masalan: Aziz, +998 90 123 45 67",
  });
}

export function orderCreatedReply(
  language: IntentLanguage,
  product: string,
  size: string | null,
  total: number,
): string {
  const what = size ? `${product}, ${size}` : product;
  return pick(language, {
    ru: `✅ Заявка принята!\n${what} — ${formatMoney(total)}\n\nПродавец свяжется с вами для подтверждения.`,
    uz: `✅ Buyurtma qabul qilindi!\n${what} — ${formatMoney(total)}\n\nSotuvchi tasdiqlash uchun bog'lanadi.`,
  });
}

export function orderFailedReply(language: IntentLanguage): string {
  // Said when the RPC refused — almost always because the last item went while
  // the customer was typing their phone number. No detail, because the specific
  // reason is the seller's to explain.
  return pick(language, {
    ru: "Не получилось оформить заявку — продавец скоро напишет вам сам.",
    uz: "Buyurtmani rasmiylashtira olmadim — sotuvchi tez orada o'zi yozadi.",
  });
}
