"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { MessageCircleQuestion, Database, ShieldCheck, BellRing, Link2, Settings2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { ChatDemo } from "@/components/landing/chat-demo";
import { StaggerItem } from "@/components/landing/stagger-section";

/**
 * The site root — a product landing page for prospective sellers, not a
 * storefront. Every store's own storefront lives at /s/[store] now (see that
 * route group); this page sells the service that runs it.
 */

const SELLER_STEPS = [
  { icon: Link2, tint: "orange", titleKey: "step1Title", bodyKey: "step1Body" },
  { icon: Database, tint: "blue", titleKey: "step2Title", bodyKey: "step2Body" },
  { icon: ShieldCheck, tint: "orange", titleKey: "step3Title", bodyKey: "step3Body" },
  { icon: BellRing, tint: "blue", titleKey: "step4Title", bodyKey: "step4Body" },
] as const;

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_28px_rgba(79,101,235,0.35)] transition-transform active:scale-[0.97]"
      style={{ background: "var(--accent-orange-grad)" }}
    >
      {children}
    </Link>
  );
}

function GhostButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-divider bg-glass-bg px-6 py-3.5 text-[15px] font-semibold text-fg-primary backdrop-blur-xl transition-transform active:scale-[0.97]"
    >
      {children}
    </a>
  );
}

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <div className="flex min-h-screen flex-col bg-bg-app text-fg-primary transition-colors duration-300">
      <header className="sticky top-0 z-40 border-b border-divider bg-header-bg backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 sm:px-12">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-[34px] w-[34px]" />
            <span className="text-[17px] font-bold tracking-tight">Javob</span>
          </div>
          <div className="flex items-center gap-3">
            <LocaleToggle />
            <ThemeToggle />
            <Link
              href="/admin/login"
              className="rounded-full border border-divider bg-glass-bg px-[18px] py-[9px] text-[13px] font-semibold text-fg-primary backdrop-blur-xl"
            >
              {t("signIn")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute -left-32 -top-40 h-[420px] w-[420px] rounded-full blur-[30px]"
            style={{
              background: "radial-gradient(circle, var(--tint-orange), transparent 70%)",
              animation: "floatBlobA 14s ease-in-out infinite",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-44 -right-24 h-[460px] w-[460px] rounded-full blur-[30px]"
            style={{
              background: "radial-gradient(circle, var(--tint-blue), transparent 70%)",
              animation: "floatBlobB 16s ease-in-out infinite",
            }}
          />

          <div className="relative z-[2] mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 py-20 sm:px-12 sm:py-28 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight sm:text-[42px] md:text-[52px]">
                {t("heroTitleLine1")}
                <br />
                {t("heroTitleLine2")}
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-fg-secondary">{t("heroSubtitle")}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <PrimaryButton href="/admin/login">{t("ctaStart")}</PrimaryButton>
                <GhostButton href="#how">{t("ctaHow")}</GhostButton>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <ChatDemo />
            </motion.div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-y border-divider bg-bg-app-2 py-14">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <MessageCircleQuestion className="mx-auto h-8 w-8 text-fg-tertiary" strokeWidth={1.5} />
            <p className="mt-5 text-xl leading-relaxed text-fg-secondary">{t("problemQuote")}</p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-5xl px-6 py-24 sm:px-12">
          <h2 className="text-center text-[32px] font-bold tracking-tight">{t("howItWorksTitle")}</h2>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {SELLER_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <StaggerItem
                  key={step.titleKey}
                  index={i}
                  className="flex gap-4 rounded-[18px] border border-divider bg-glass-bg p-[22px] backdrop-blur-xl"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.tint === "orange" ? "bg-tint-orange text-accent-orange" : "bg-tint-blue text-accent-blue"}`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-bold text-fg-primary">{t(step.titleKey)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-secondary">{t(step.bodyKey)}</p>
                  </div>
                </StaggerItem>
              );
            })}
          </div>
        </section>

        {/* How it looks for the customer */}
        <section className="border-y border-divider bg-bg-app-2 py-20">
          <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-14 px-6 sm:px-12 md:grid-cols-2">
            <div>
              <h2 className="text-[30px] font-bold tracking-tight">{t("customerViewTitle")}</h2>
              <p className="mt-3.5 max-w-md leading-relaxed text-fg-secondary">{t("customerViewBody")}</p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2.5 rounded-[22px] border border-glass-border bg-glass-bg-strong p-[18px] shadow-[0_18px_44px_var(--shadow-color)] backdrop-blur-xl">
              <div className="flex justify-start">
                <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-tint-neutral px-3.5 py-2.5 text-[13.5px] text-fg-primary">
                  {t("customerChatQuestion")}
                </div>
              </div>
              <div className="flex justify-end">
                <div
                  className="max-w-[78%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13.5px] text-white"
                  style={{ background: "var(--accent-orange-grad)" }}
                >
                  {t("customerChatAnswer")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What you control */}
        <section className="mx-auto max-w-2xl px-6 py-24 text-center sm:px-12">
          <Settings2 className="mx-auto h-8 w-8 text-fg-tertiary" strokeWidth={1.5} />
          <h2 className="mt-5 text-[30px] font-bold tracking-tight">{t("controlTitle")}</h2>
          <p className="mx-auto mt-3.5 max-w-lg leading-relaxed text-fg-secondary">{t("controlBody")}</p>
        </section>

        {/* Trust boundary — fixed dark surface in either theme, matching the design source */}
        <section className="py-24" style={{ background: "oklch(16% 0.01 50)" }}>
          <div className="mx-auto max-w-2xl px-6 text-center sm:px-12">
            <div
              className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: "rgba(79,101,235,0.16)" }}
            >
              <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.5} style={{ color: "var(--accent-orange)" }} />
            </div>
            <h2 className="mt-5 text-[28px] font-bold tracking-tight text-[#f5f4f2]">{t("trustTitle")}</h2>
            <p className="mx-auto mt-3.5 max-w-lg text-[15.5px] leading-[1.7] text-[rgba(245,244,242,0.6)]">
              {t("trustBody")}
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-24 text-center sm:px-12">
          <h2 className="text-[30px] font-bold tracking-tight">{t("finalCtaTitle")}</h2>
          <p className="mx-auto mt-3 text-fg-secondary">{t("finalCtaBody")}</p>
          <div className="mt-7">
            <PrimaryButton href="/admin/login">{t("ctaStart")}</PrimaryButton>
          </div>
        </section>
      </main>

      <footer className="border-t border-divider">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-6 py-8 sm:px-12">
          <LogoMark className="h-[26px] w-[26px]" />
          <span className="text-[13px] text-fg-tertiary">{t("footerTagline")}</span>
        </div>
      </footer>
    </div>
  );
}
