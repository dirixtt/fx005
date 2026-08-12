/**
 * Reading a name and a phone number out of one free-text message.
 *
 * Deliberately not a model call. "Азиз, +998 90 123 45 67" is a regex problem,
 * and a phone number is the one field in this system where being confidently
 * wrong costs a real order — the seller rings a number nobody answers and the
 * customer is never heard from again.
 */

export type Contact = {
  name: string | null;
  phone: string | null;
  /** District or address, when the customer volunteered one. Often null. */
  address: string | null;
};

/** Runs of digits with the separators people actually type between them. */
const PHONE_CANDIDATE = /(\+?[\d][\d\s\-()]{7,20}\d)/g;

/**
 * Normalises a phone number to E.164, assuming Uzbekistan.
 *
 * The country assumption is safe here and only here: this is a shop selling
 * within Uzbekistan, and a bare nine-digit number typed by its customers is an
 * Uzbek mobile every time.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  // 901234567 — the local form, by far the most common thing typed.
  if (digits.length === 9) return `+998${digits}`;

  // 998901234567, with or without the plus the customer forgot.
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;

  // Anything else of plausible international length is kept as-is rather than
  // being bent into an Uzbek number it is not.
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;

  return null;
}

/**
 * Pulls a contact out of a message.
 *
 * Either field may come back null — the caller decides whether that is enough to
 * proceed. A missing name is recoverable (Telegram tells us what the account is
 * called); a missing phone is not.
 */
export function parseContact(text: string): Contact {
  const candidates = text.match(PHONE_CANDIDATE) ?? [];

  let phone: string | null = null;
  let matched = "";
  for (const candidate of candidates) {
    const normalized = normalizePhone(candidate);
    if (normalized) {
      phone = normalized;
      matched = candidate;
      break;
    }
  }

  // Whatever is left once the number is removed. People separate the parts the
  // way they were asked to — "Азиз, +998…, Юнусабад" — so commas and newlines are
  // the field boundaries, not noise.
  const parts = (matched ? text.replace(matched, " ") : text)
    .split(/[,;|\n]+/)
    .map((part) => part.replace(/\s+/g, " ").replace(/^[\s\-—:]+|[\s\-—:]+$/g, "").trim())
    .filter((part) => part.length > 0);

  const [first, ...rest] = parts;

  // A "name" of thirty words is a sentence, not a name — and writing a sentence
  // into the orders table makes the seller's list unreadable.
  const name = first && first.length >= 2 && first.length <= 60 ? first : null;

  // Everything after the name is where to deliver. Left null when they gave only
  // a name and number: the seller asks on the confirmation call, which they make
  // regardless.
  const address = rest.length > 0 ? rest.join(", ").slice(0, 200) : null;

  return { name, phone, address };
}
