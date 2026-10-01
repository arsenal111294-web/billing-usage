import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import type { Integration } from "@/lib/types";
import { SyncButton } from "./sync-button";
import { Badge, Card } from "./ui";
import { UsageMeter } from "./usage-meter";

const PROVIDER_NAMES: Record<Integration["provider"], string> = {
  netlify: "Netlify",
  supabase: "Supabase",
  anthropic: "Anthropic",
  openai: "OpenAI",
  manual: "Вручную",
};

export function StatusBadge({ integration }: { integration: Integration }) {
  if (integration.status === "error")
    return (
      <Badge tone="critical">
        <AlertCircle className="size-3.5" aria-hidden /> Ошибка
      </Badge>
    );
  if (integration.status === "pending")
    return (
      <Badge>
        <Clock className="size-3.5" aria-hidden /> Ожидает синхронизации
      </Badge>
    );
  return (
    <Badge tone="good">
      <CheckCircle2 className="size-3.5" aria-hidden /> Подключено
    </Badge>
  );
}

export function IntegrationCard({ integration, footer }: { integration: Integration; footer?: React.ReactNode }) {
  const usage = integration.usage;
  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{PROVIDER_NAMES[integration.provider]}</p>
          <h3 className="truncate font-semibold text-ink">{integration.name}</h3>
          {usage?.plan ? <p className="text-sm text-ink-2">Тариф: {usage.plan}</p> : null}
        </div>
        <div className="shrink-0">
          <StatusBadge integration={integration} />
        </div>
      </div>

      {integration.status === "error" && integration.lastError ? (
        <p className="rounded-lg bg-critical-track/60 px-3 py-2 text-sm text-critical-ink">{integration.lastError}</p>
      ) : null}

      {usage?.notes?.map((note) => (
        <p key={note} className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2">
          {note}
        </p>
      ))}

      {usage?.metrics.length ? (
        <div className="flex flex-col gap-4">
          {usage.metrics.map((metric) => (
            <UsageMeter key={metric.key} metric={metric} />
          ))}
        </div>
      ) : integration.status !== "error" ? (
        <p className="text-sm text-muted">Данных пока нет — запустите синхронизацию.</p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-xs text-muted">
          {integration.lastSyncedAt ? `Обновлено ${formatDateTime(integration.lastSyncedAt)} UTC` : "Ещё не синхронизировано"}
        </span>
        <div className="flex items-center gap-1">
          {footer}
          <SyncButton integrationId={integration.id} />
        </div>
      </div>
    </Card>
  );
}
