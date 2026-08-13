"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, type AppLocale } from "@/lib/i18n/locale";

export async function setLocale(locale: AppLocale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
}
