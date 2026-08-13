import { cookies } from "next/headers";

export type AppLocale = "ru" | "uz";

export const LOCALES: AppLocale[] = ["ru", "uz"];
export const DEFAULT_LOCALE: AppLocale = "ru";

export const LOCALE_COOKIE = "javob-locale";

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === "ru" || value === "uz";
}

/** Server-side read of the seller's chosen interface language, defaulting to Russian. */
export async function getLocale(): Promise<AppLocale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isAppLocale(value) ? value : DEFAULT_LOCALE;
}
