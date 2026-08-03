"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"loading" | "signup" | "login" | "check-email">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.rpc("owner_exists").then(({ data, error }) => {
      if (error) {
        setError(error.message);
        setMode("login");
        return;
      }
      setMode(data ? "login" : "signup");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
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
      router.push("/admin");
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

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-neutral-900">
            {mode === "signup" ? "Create your owner account" : "Store owner login"}
          </CardTitle>
          {mode === "signup" && (
            <p className="text-sm text-neutral-500">
              No owner account exists yet. Set one up now — this is the only login for the store.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {mode === "loading" && <p className="text-sm text-neutral-500">Loading...</p>}

          {mode === "check-email" && (
            <div className="space-y-3 text-sm text-neutral-700">
              <p>We sent a confirmation link to <strong>{email}</strong>.</p>
              <p>Click the link in that email, then come back and log in below.</p>
              <Button variant="outline" className="w-full" onClick={() => setMode("login")}>
                Go to login
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
                <Label htmlFor="password">Password</Label>
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
                  <Label htmlFor="confirmPassword">Confirm password</Label>
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
                {submitting ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
