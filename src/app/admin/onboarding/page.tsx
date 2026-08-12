import { redirect } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/components/admin/onboarding-form";
import { getCurrentStore } from "@/lib/stores/current-store";

export default async function OnboardingPage() {
  // Already has a store — nothing to onboard, and create_store would just
  // reject a second one for this account anyway.
  const existing = await getCurrentStore();
  if (existing) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoMark className="h-14 w-14 text-white" />
          <div>
            <p className="text-lg font-bold text-white">Ваш магазин</p>
            <p className="text-xs text-neutral-400">Последний шаг перед кабинетом</p>
          </div>
        </div>

        <Card className="border-neutral-800 bg-white">
          <CardHeader>
            <CardTitle className="text-base font-semibold normal-case tracking-normal text-neutral-900">
              Создайте магазин
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OnboardingForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
