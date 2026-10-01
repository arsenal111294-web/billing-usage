import type { ReactNode } from "react";
import { Info, LogOut, ShieldAlert, WalletCards } from "lucide-react";
import { logout } from "@/app/login/actions";
import { NativeBridge } from "@/components/native-bridge";
import { Nav } from "@/components/nav";
import { isAuthEnabled, requireAuth } from "@/lib/auth";
import { loadAppData } from "@/lib/data";
import { isDemoMode } from "@/lib/env";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireAuth();
  const { alerts } = await loadAppData();
  const demo = isDemoMode();
  const authEnabled = isAuthEnabled();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-page/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
              <WalletCards className="size-4" aria-hidden />
            </span>
            <span className="font-semibold text-ink">Billing Tracker</span>
          </div>
          <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
            <Nav alertCount={alerts.filter((a) => a.severity !== "info").length} />
          </div>
          {authEnabled ? (
            <form action={logout} className="ml-auto sm:ml-0">
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <LogOut className="size-4" aria-hidden />
                Выйти
              </button>
            </form>
          ) : null}
        </div>
      </header>

      {demo || !authEnabled ? (
        <div className="mx-auto mt-4 flex w-full max-w-6xl flex-col gap-2 px-4">
          {demo ? (
            <p className="flex items-start gap-2 rounded-lg border border-line bg-accent-track/40 px-3 py-2 text-sm text-ink-2">
              <Info className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
              <span>
                <b className="text-ink">Демо-режим.</b> Supabase не подключён — данные хранятся в памяти сервера и сбрасываются при
                перезапуске. Задайте <code>SUPABASE_URL</code> и <code>SUPABASE_SERVICE_ROLE_KEY</code>, чтобы сохранять их.
              </span>
            </p>
          ) : null}
          {!authEnabled ? (
            <p className="flex items-start gap-2 rounded-lg border border-line bg-warning-track/50 px-3 py-2 text-sm text-ink-2">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning-ink" aria-hidden />
              <span>
                <b className="text-ink">Вход без пароля.</b> Задайте <code>APP_PASSWORD</code>, прежде чем сохранять реальные API-ключи на
                публичном адресе.
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <NativeBridge />
    </div>
  );
}
