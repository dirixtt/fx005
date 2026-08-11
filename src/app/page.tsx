"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { MessageCircleQuestion, Database, ShieldCheck, BellRing, Link2, Settings2 } from "lucide-react";
import { LogoLockup } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { ChatDemo } from "@/components/landing/chat-demo";
import { StaggerItem } from "@/components/landing/stagger-section";
import { cn } from "@/lib/utils";

/**
 * The site root — a product landing page for prospective sellers, not a
 * storefront. Every store's own storefront lives at /s/[store] now (see that
 * route group); this page sells the service that runs it.
 */

const SELLER_STEPS = [
  {
    icon: Link2,
    title: "Подключите Telegram Business",
    body: "Код за минуту — привязываете свой аккаунт к боту, без разработки и без нового номера.",
  },
  {
    icon: Database,
    title: "Бот читает остатки из вашего каталога",
    body: "Размеры, цвета, цены — всё из данных, которые вы сами вносите в кабинете.",
  },
  {
    icon: ShieldCheck,
    title: "Отвечает только из данных",
    body: "Наличие и цену бот никогда не придумывает — это правило зашито в код, не в промпт.",
  },
  {
    icon: BellRing,
    title: "Неотвеченное само приходит вам",
    body: "Не понял вопрос — сразу пингует вас в Telegram, и всё равно попадает в напоминание.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <LogoLockup className="text-brandnavy" />
          <Link href="/admin/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Войти
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-4 py-16 sm:py-24 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl md:text-5xl">
              Продавайте в Telegram — бот отвечает клиентам за вас
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-neutral-600 sm:text-lg">
              Отвечает по остаткам из вашей базы, никогда не выдумывает наличие и цену, и передаёт вам всё,
              что не смог сам. Вы просто отгружаете.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/admin/login" className={buttonVariants({ size: "lg" })}>
                Начать бесплатно
              </Link>
              <a href="#how-it-works" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                Как это работает
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          >
            <ChatDemo />
          </motion.div>
        </section>

        {/* Problem */}
        <section className="border-y border-neutral-200 bg-white py-14">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <MessageCircleQuestion className="mx-auto h-8 w-8 text-neutral-400" strokeWidth={1.5} />
            <p className="mt-4 text-lg leading-relaxed text-neutral-700 sm:text-xl">
              «42 бор ми?» — сотый раз за день. Пока вы печатаете ответ, клиент уже пишет в другой магазин.
              А что вчера спрашивали и что вы ответили — нигде не записано.
            </p>
          </div>
        </section>

        {/* How it works — seller */}
        <section id="how-it-works" className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Как это работает
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {SELLER_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <StaggerItem key={step.title} index={i} className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-600">{step.body}</p>
                  </div>
                </StaggerItem>
              );
            })}
          </div>
        </section>

        {/* How it looks for the customer */}
        <section className="border-y border-neutral-200 bg-white py-16 sm:py-20">
          <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-4 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                Для клиента — просто обычный чат
              </h2>
              <p className="mt-3 max-w-md leading-relaxed text-neutral-600">
                Вопрос на русском или узбекском — мгновенный точный ответ — заказ, не выходя из Telegram.
                Никакого нового приложения, никакого сайта, к которому нужно привыкать.
              </p>
            </div>
            <ChatDemo />
          </div>
        </section>

        {/* What you control */}
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <Settings2 className="mx-auto h-8 w-8 text-neutral-400" strokeWidth={1.5} />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Вы решаете, что бот делает сам
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-neutral-600">
            В кабинете включаете и выключаете каждую возможность отдельно — наличие, цену, статус заказа,
            приём заявок, подбор по фото. Задаёте, через сколько минут напоминать о неотвеченном чате.
            Ничего не работает по умолчанию так, как вы не выбрали сами.
          </p>
        </section>

        {/* Trust boundary */}
        <section className="bg-ink-950 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <ShieldCheck className="mx-auto h-9 w-9 text-brand-400" strokeWidth={1.5} />
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Бот никогда не выдумывает наличие или цену
            </h2>
            <p className="mx-auto mt-3 max-w-xl leading-relaxed text-neutral-400">
              Это не просьба в промпте — модель физически не может ответить клиенту свободным текстом.
              Она только классифицирует вопрос и вызывает функцию; каждый ответ о цене и наличии код
              собирает сам, строго из вашей базы. Если бот не уверен — он честно молчит и зовёт вас,
              а не гадает.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Начните бесплатно</h2>
          <p className="mx-auto mt-3 max-w-md text-neutral-600">
            Создайте магазин прямо сейчас — кабинет откроется через минуту.
          </p>
          <Link href="/admin/login" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
            Начать бесплатно
          </Link>
        </section>
      </main>

      <footer className="border-t border-neutral-200 bg-white py-8">
        <div className="mx-auto max-w-5xl px-4 text-sm text-neutral-500">
          <LogoLockup className="text-brandnavy" />
          <p className="mt-2">Telegram-ассистент для продавцов одежды и обуви.</p>
        </div>
      </footer>
    </div>
  );
}
