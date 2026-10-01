import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { ConfirmButton } from "@/components/confirm-button";
import { IntegrationCard } from "@/components/integration-card";
import { IntegrationForm } from "@/components/integration-form";
import { QuickConnect } from "@/components/quick-connect";
import { SyncButton } from "@/components/sync-button";
import { buttonClass, Card, CardHeader } from "@/components/ui";
import { loadAppData } from "@/lib/data";
import { providerCatalog } from "@/lib/integrations";
import { isStale } from "@/lib/integrations/stale";
import { deleteIntegrationAction } from "./actions";

export const metadata: Metadata = { title: "Интеграции" };

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const { integrations } = await loadAppData();
  const providers = providerCatalog();
  const editing = edit ? integrations.find((i) => i.id === edit) : undefined;
  const hasStale = integrations.some((i) => isStale(i));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Интеграции</h1>
          <p className="text-sm text-muted">
            Данные обновляются при открытии страницы (если старше 15 минут), раз в сутки и по кнопке.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasStale ? <AutoRefresh /> : null}
          {integrations.length ? <SyncButton label="Обновить все" /> : null}
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader title={`Настройки: ${editing.name}`} description="Измените параметры или замените ключ" />
          <IntegrationForm key={editing.id} providers={providers} integration={editing} />
        </Card>
      ) : (
        <Card>
          <CardHeader title="Подключить сервис" description="Вставьте ключ — сервис определится сам, данные подтянутся сразу" />
          <QuickConnect />
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {providers
              .filter((p) => p.docsUrl)
              .map((p) => (
                <li key={p.id}>
                  <a
                    href={p.docsUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-accent-strong hover:underline"
                  >
                    Ключ {p.name} <ExternalLink className="size-3" aria-hidden />
                  </a>
                </li>
              ))}
          </ul>
          <details className="mt-5 border-t border-line pt-4">
            <summary className="cursor-pointer text-sm font-medium text-ink-2 hover:text-ink">
              Ручная настройка: бюджет, конкретный проект или «Ручной лимит» для сервисов без API
            </summary>
            <div className="mt-4">
              <IntegrationForm key="new" providers={providers} integration={null} />
            </div>
          </details>
        </Card>
      )}

      {integrations.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              footer={
                <>
                  <Link
                    href={`/integrations?edit=${integration.id}`}
                    className={buttonClass("ghost", "sm")}
                    aria-label={`Настроить ${integration.name}`}
                    title="Настроить"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Link>
                  <ConfirmButton
                    action={deleteIntegrationAction.bind(null, integration.id)}
                    confirm={`Удалить интеграцию «${integration.name}» вместе с сохранённым ключом?`}
                    label={`Удалить ${integration.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </ConfirmButton>
                </>
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
