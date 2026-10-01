import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { WalletCards } from "lucide-react";
import { isAuthenticated, isAuthEnabled } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage() {
  // Наличие APP_PASSWORD проверяется в рантайме, а не на этапе сборки.
  await connection();
  if (!isAuthEnabled() || (await isAuthenticated())) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-white">
            <WalletCards className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink">Billing Tracker</h1>
            <p className="text-sm text-muted">Подписки и лимиты сервисов</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
