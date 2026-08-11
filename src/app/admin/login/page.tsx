"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LogoMark } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Any number of sellers can have an account now — this is no longer gated
 * behind "does an owner already exist" (that only ever made sense for a
 * single-store deployment). A brand-new signup lands on /admin/onboarding,
 * which creates their store; an existing owner with no store yet (there is
 * exactly one, from before this pivot) lands there too.
 */
export default function LoginPage() {
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
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoMark className="h-14 w-14 text-white" />
          <div>
            <p className="text-lg font-bold text-white">FX005</p>
            <p className="text-xs text-neutral-400">Панель управления магазином</p>
          </div>
        </div>

        <Card className="border-neutral-800 bg-white">
          <CardHeader>
            <CardTitle className="text-base font-semibold normal-case tracking-normal text-neutral-900">
              {mode === "signup" ? "Создать аккаунт" : "Вход"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mode === "check-email" && (
              <div className="space-y-3 text-sm text-neutral-700">
                <p>
                  Мы отправили ссылку для подтверждения на <strong>{email}</strong>.
                </p>
                <p>Перейдите по ссылке в письме, затем вернитесь и войдите ниже.</p>
                <Button variant="outline" className="w-full" onClick={() => setMode("login")}>
                  Перейти ко входу
                </Button>
              </div>
            )}

            {(mode === "signup" || mode === "login") && (
              <form onSubmit={mode === "signup" ? handleSignup : handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Подождите..." : mode === "signup" ? "Создать аккаунт" : "Войти"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode(mode === "signup" ? "login" : "signup");
                  }}
                  className="w-full text-center text-xs text-neutral-500 hover:text-neutral-700"
                >
                  {mode === "signup" ? "Уже есть аккаунт? Войти" : "Ещё нет аккаунта? Создать"}
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
