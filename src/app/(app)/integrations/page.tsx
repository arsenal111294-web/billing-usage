import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { IntegrationCard } from "@/components/integration-card";
import { IntegrationForm } from "@/components/integration-form";
import { SyncButton } from "@/components/sync-button";
import { buttonClass, Card, CardHeader } from "@/components/ui";
import { loadAppData } from "@/lib/data";
import { providerCatalog } from "@/lib/integrations";
import { deleteIntegrationAction } from "./actions";

export const metadata: Metadata = { title: "Интеграции" };

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const { integrations } = await loadAppData();
  const providers = providerCatalog();
  const editing = edit ? integrations.find((i) => i.id === edit) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Интеграции</h1>
          <p className="text-sm text-muted">API-ключи для автоматического отслеживания расходов и лимитов. Данные обновляются раз в сутки и по кнопке.</p>
        </div>
        {integrations.length ? <SyncButton label="Обновить все" /> : null}
      </div>

      <Card>
        <CardHeader
          title={editing ? `Настройки: ${editing.name}` : "Подключить сервис"}
          description={editing ? "Измените параметры или замените ключ" : "Выберите сервис и вставьте ключ — данные подтянутся сразу"}
        />
        <IntegrationForm key={editing?.id ?? "new"} providers={providers} integration={editing ?? null} />
      </Card>

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
