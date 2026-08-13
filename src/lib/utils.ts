import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AppLocale } from "@/lib/i18n/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Constructed once per locale — formatMoney runs per row in product grids and
// report tables, and building an Intl.NumberFormat on every call is measurably
// expensive.
const moneyFormatters: Record<AppLocale, Intl.NumberFormat> = {
  ru: new Intl.NumberFormat("ru-RU", { style: "currency", currency: "UZS", maximumFractionDigits: 0 }),
  uz: new Intl.NumberFormat("uz-Latn-UZ", { style: "currency", currency: "UZS", maximumFractionDigits: 0 }),
};

export function formatMoney(value: number, locale: AppLocale = "ru") {
  return moneyFormatters[locale].format(value);
}

// Russian and Uzbek Cyrillic, which most of the catalogue is written in. Without
// this the character class below strips the name to nothing and every Cyrillic
// product collapses to the same empty slug.
const TRANSLITERATION: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[Ѐ-ӿ]/g, (char) => TRANSLITERATION[char] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
