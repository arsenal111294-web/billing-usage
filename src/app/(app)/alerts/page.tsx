import type { Metadata } from "next";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { AlertRow } from "@/components/alert-row";
import { RunCheckButton, TestNotificationButton } from "@/components/notification-controls";
import { Badge, Card, CardHeader } from "@/components/ui";
import { LIMIT_CRITICAL, LIMIT_WARNING } from "@/lib/alerts";
import { loadAppData } from "@/lib/data";
import { env } from "@/lib/env";
import { channelStatuses } from "@/lib/notifications";

export const metadata: Metadata = { title: "Уведомления" };

export default async function AlertsPage() {
  const { alerts } = await loadAppData();
  const channels = channelStatuses();
  const cronConfigured = Boolean(env.cronSecret);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Уведомления</h1>
        <p className="text-sm text-muted">
          Напоминания о списаниях (за 0–14 дней, настраивается в подписке) и о лимитах: предупреждение от {Math.round(LIMIT_WARNING * 100)}%,
          отправка в каналы от {Math.round(LIMIT_CRITICAL * 100)}%.
        </p>
      </div>

      <Card>
        <CardHeader title="Активные алерты" description={alerts.length ? `Всего: ${alerts.length}` : undefined} />
        {alerts.length ? (
          <ul className="flex flex-col gap-1">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Нет активных алертов.</p>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Каналы доставки" description="Настраиваются переменными окружения" />
          <ul className="flex flex-col gap-4">
            {channels.map((c) => (
              <li key={c.channel} className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    {c.label}
                    {c.configured ? (
                      <Badge tone="good">
                        <CheckCircle2 className="size-3.5" aria-hidden /> Настроен
                      </Badge>
                    ) : (
                      <Badge>
                        <CircleDashed className="size-3.5" aria-hidden /> Не настроен
                      </Badge>
                    )}
                  </p>
                  {!c.configured ? <p className="mt-1 text-xs text-muted">Задайте: {c.missing.join(", ")}</p> : null}
                </div>
                <TestNotificationButton channel={c.channel} disabled={!c.configured} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Ежедневная проверка" description="Синхронизация лимитов, перенос дат списаний и рассылка" />
          <div className="flex flex-col gap-3 text-sm text-ink-2">
            <p>
              На Netlify запускается автоматически (Scheduled Function <code>daily-check</code>, 06:00 UTC).
              {cronConfigured ? null : (
                <>
                  {" "}
                  <b className="text-warning-ink">Не задан CRON_SECRET</b> — автоматический запуск будет отклонён.
                </>
              )}
            </p>
            <p className="text-xs text-muted">Каждое напоминание отправляется в канал один раз, поэтому повторный запуск не дублирует сообщения.</p>
            <RunCheckButton />
          </div>
        </Card>
      </div>
    </div>
  );
}
