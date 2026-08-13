"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Any number of sellers can have an account now — this is no longer gated
 * behind "does an owner already exist" (that only ever made sense for a
 * single-store deployment). A brand-new signup lands on /admin/onboarding,
 * which creates their store; an existing owner with no store yet (there is
 * exactly one, from before this pivot) lands there too.
 */
export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signup" | "login" | "check-email">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push("/admin/onboarding");
      router.refresh();
    } else {
      setMode("check-email");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    // /admin's layout redirects to /admin/onboarding itself when this account
    // has no store yet — no need to guess that here.
    router.push("/admin");
    router.refresh();
  }

  const inputClassName =
    "h-auto w-full rounded-xl border-divider bg-input-bg px-3.5 py-3 text-sm text-fg-primary shadow-none placeholder:text-fg-tertiary focus-visible:ring-accent-orange";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-app px-5 py-20 text-fg-primary transition-colors duration-300">
      <div
        className="pointer-events-none absolute -left-24 -top-36 h-[380px] w-[380px] rounded-full blur-[30px]"
        style={{
          background: "radial-gradient(circle, var(--tint-orange), transparent 70%)",
          animation: "floatBlobA 14s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-28 h-[420px] w-[420px] rounded-full blur-[30px]"
        style={{
          background: "radial-gradient(circle, var(--tint-blue), transparent 70%)",
          animation: "floatBlobB 16s ease-in-out infinite",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-[2] w-full max-w-[400px] rounded-3xl border border-glass-border bg-glass-bg-strong p-10 shadow-[0_24px_60px_var(--shadow-color)] backdrop-blur-xl"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="mb-4 h-11 w-11 shadow-[0_6px_18px_rgba(79,101,235,0.35)]" />
          <h1 className="text-[22px] font-bold tracking-tight">
            {mode === "signup" ? t("titleSignup") : t("titleLogin")}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-fg-tertiary">{t("subtitle")}</p>
        </div>

        {mode === "check-email" && (
          <div className="space-y-4 text-sm text-fg-secondary">
            <p>
              {t.rich("checkEmailText", {
                email,
                strong: (chunks) => <strong className="text-fg-primary">{chunks}</strong>,
              })}
            </p>
            <p>{t("checkEmailInstructions")}</p>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="w-full rounded-full border border-divider bg-glass-bg px-4 py-3 text-sm font-semibold text-fg-primary backdrop-blur-xl"
            >
              {t("goToLogin")}
            </button>
          </div>
        )}

        {(mode === "signup" || mode === "login") && (
          <form onSubmit={mode === "signup" ? handleSignup : handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12.5px] font-semibold text-fg-secondary">
                {t("emailLabel")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@shop.uz"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12.5px] font-semibold text-fg-secondary">
                {t("passwordLabel")}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={mode === "signup" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
              />
            </div>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-[12.5px] font-semibold text-fg-secondary">
                  {t("confirmPasswordLabel")}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClassName}
                />
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full px-4 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_10px_26px_rgba(79,101,235,0.32)] transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
              style={{ background: "var(--accent-orange-grad)" }}
            >
              {submitting ? t("submitting") : mode === "signup" ? t("createAccount") : t("signIn")}
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-divider" />
              <span className="text-xs text-fg-tertiary">{t("or")}</span>
              <div className="h-px flex-1 bg-divider" />
            </div>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === "signup" ? "login" : "signup");
              }}
              className="w-full text-center text-[13.5px] text-fg-secondary hover:text-fg-primary"
            >
              {mode === "signup" ? t("toggleToLogin") : t("toggleToSignup")}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
