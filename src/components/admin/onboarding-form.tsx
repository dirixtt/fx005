"use client";

import { useActionState, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { createStore, type CreateStoreState } from "@/lib/actions/onboarding";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm() {
  const t = useTranslations("onboarding");
  const [state, formAction, pending] = useActionState<CreateStoreState, FormData>(createStore, undefined);
  const [name, setName] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");

  const previewSlug = slugTouched ? slug : slugify(name).slice(0, 40);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">{t("slugLabel")}</Label>
        <div className="flex items-center gap-1 text-sm text-neutral-500">
          <span className="shrink-0">/s/</span>
          <Input
            id="slug"
            name="slug"
            value={previewSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value).slice(0, 40));
            }}
            placeholder={t("slugPlaceholder")}
            className="font-mono"
          />
        </div>
        <motion.p
          key={previewSlug}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="text-xs text-neutral-500"
        >
          {t("slugPreview", { slug: previewSlug || "…" })}
        </motion.p>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
