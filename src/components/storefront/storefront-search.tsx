"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStore } from "@/lib/store-context";

export function StorefrontSearch() {
  const t = useTranslations("storefront");
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useStore();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`/s/${store.slug}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="h-9 w-full rounded-full border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm shadow-inner outline-none transition-colors focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
      />
    </form>
  );
}
