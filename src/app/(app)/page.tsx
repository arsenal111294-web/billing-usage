import Link from "next/link";
import { ArrowRight, CalendarClock, Plus } from "lucide-react";
import { AlertRow } from "@/components/alert-row";
import { IntegrationCard } from "@/components/integration-card";
import { SpendingChart } from "@/components/spending-chart";
import { SyncButton } from "@/components/sync-button";
import { buttonClass, Card, CardHeader, EmptyState } from "@/components/ui";
import { computeTotals, forecastCharges, upcomingCharges } from "@/lib/billing";
import { buildForecastChart } from "@/lib/chart";
import { convert, formatMoney } from "@/lib/currency";
import { formatDate, relativeDays } from "@/lib/dates";
import { loadAppData } from "@/lib/data";

export default async function DashboardPage() {
  const { today, subscriptions, integrations, alerts, currency, rates } = await loadAppData();
  const totals = computeTotals(subscriptions, currency, rates);
  const forecast = forecastCharges(subscriptions, today, currency, rates, 12);
  const chart = buildForecastChart(forecast);
  const upcoming = upcomingCharges(subscriptions, today, 30);
  const next = upcoming[0];
  const thisMonth = forecast[0]?.total ?? 0;
  const maxCategory = Math.max(...totals.byCategory.map((c) => c.monthly), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Дашборд</h1>
          <p className="text-sm text-muted">Итоги в {currency}, сегодня {formatDate(today)}</p>
        </div>
        <Link href="/subscriptions?new=1" className={buttonClass("primary")}>
          <Plus className="size-4" aria-hidden /> Добавить подписку
        </Link>
      </div>

      {/* Ключевые показатели */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-ink-2">Расходы в месяц</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-ink">{formatMoney(totals.monthly, currency)}</p>
          <p className="mt-1 text-xs text-muted">годовые подписки учтены как 1/12</p>
        </Card>
        <Stat label="Расходы в год" value={formatMoney(totals.yearly, currency)} hint={`в этом месяце к списанию ${formatMoney(thisMonth, currency)}`} />
        <Stat
          label="Активные подписки"
          value={String(totals.activeCount)}
          hint={totals.pausedCount ? `на паузе: ${totals.pausedCount}` : "все активны"}
        />
        <Stat
          label="Ближайшее списание"
          value={next ? formatMoney(convert(next.subscription.cost, next.subscription.currency, currency, rates), currency) : "—"}
          hint={next ? `${next.subscription.name}, ${relativeDays(next.daysLeft)}` : "в ближайшие 30 дней нет"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Прогноз списаний на 12 месяцев" description="Фактические платежи по месяцам с разбивкой по категориям" />
          {totals.activeCount > 0 ? (
            <>
              <SpendingChart data={chart.data} series={chart.series} currency={currency} />
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-label="Легенда">
                {chart.series.map((s) => (
                  <li key={s.key} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
                    {s.label}
                  </li>
                ))}
              </ul>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-ink-2 hover:text-ink">Показать таблицей</summary>
                <table className="tabular mt-2 w-full text-left">
                  <thead className="text-muted">
                    <tr>
                      <th className="py-1 font-medium">Месяц</th>
                      <th className="py-1 text-right font-medium">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.data.map((row) => (
                      <tr key={String(row.label)} className="border-t border-line">
                        <td className="py-1 text-ink-2">{row.label}</td>
                        <td className="py-1 text-right text-ink">{formatMoney(Number(row.total), currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          ) : (
            <EmptyState title="Нет активных подписок" description="Добавьте подписку, чтобы увидеть прогноз расходов." />
          )}
        </Card>

        <Card>
          <CardHeader title="По категориям" description="Доля в месячных расходах" />
          {totals.byCategory.length ? (
            <ul className="flex flex-col gap-3">
              {totals.byCategory.map((c) => (
                <li key={c.category}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate text-ink-2">{c.category}</span>
                    <span className="tabular shrink-0 text-ink">
                      {formatMoney(c.monthly, currency)}
                      <span className="ml-1.5 text-muted">{Math.round((c.monthly / (totals.monthly || 1)) * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-accent-track/50">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(c.monthly / (maxCategory || 1)) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Пока пусто.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Напоминания"
            action={
              <Link href="/alerts" className="inline-flex items-center gap-1 text-sm text-accent-strong hover:underline">
                Все <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />
          {alerts.length ? (
            <ul className="flex flex-col gap-2">
              {alerts.slice(0, 5).map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Всё спокойно: ближайших списаний и исчерпанных лимитов нет.</p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Ближайшие списания" description="На 30 дней вперёд" />
          {upcoming.length ? (
            <ul className="divide-y divide-line">
              {upcoming.map(({ subscription: s, date, daysLeft }) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <CalendarClock className="size-4 shrink-0 text-muted" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                      <p className="text-xs text-muted">
                        {formatDate(date)} · {relativeDays(daysLeft)}
                      </p>
                    </div>
                  </div>
                  <span className="tabular shrink-0 text-sm text-ink">{formatMoney(s.cost, s.currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">В ближайшие 30 дней списаний нет.</p>
          )}
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Подключённые сервисы</h2>
            <p className="text-sm text-muted">Остатки лимитов и расходы по API</p>
          </div>
          <div className="flex gap-2">
            {integrations.length ? <SyncButton label="Обновить все" /> : null}
            <Link href="/integrations" className={buttonClass("secondary", "sm")}>
              <Plus className="size-4" aria-hidden /> Подключить
            </Link>
          </div>
        </div>
        {integrations.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {integrations.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Нет подключённых сервисов"
            description="Привяжите API-ключ Netlify, Supabase, Anthropic или OpenAI, чтобы видеть остатки лимитов в реальном времени."
            action={
              <Link href="/integrations" className={buttonClass("primary", "sm")}>
                Подключить сервис
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 truncate text-xs text-muted">{hint}</p>
    </Card>
  );
}
