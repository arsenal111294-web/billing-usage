import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { CatalogPicker } from "@/components/catalog-picker";
import { ConfirmButton } from "@/components/confirm-button";
import { ServiceAvatar } from "@/components/service-avatar";
import { SubscriptionForm } from "@/components/subscription-form";
import { Badge, buttonClass, Card, CardHeader, EmptyState } from "@/components/ui";
import { CYCLE_LABELS, computeTotals, effectiveNextBillingDate, monthlyEquivalent } from "@/lib/billing";
import { bundleOverlaps } from "@/lib/bundles";
import { bundlesContaining, getCatalogService } from "@/lib/catalog";
import { convert, formatMoney, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { addDays, diffInDays, formatDate, relativeDays } from "@/lib/dates";
import { loadAppData } from "@/lib/data";
import { deleteSubscriptionAction, toggleSubscriptionStatusAction } from "./actions";

export const metadata: Metadata = { title: "Подписки" };

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string; service?: string }>;
}) {
  const params = await searchParams;
  const { today, subscriptions, integrations, currency, rates } = await loadAppData();
  const editing = params.edit ? (subscriptions.find((s) => s.id === params.edit) ?? null) : null;
  const picking = Boolean(params.new) && !params.service && !editing;
  const showForm = (Boolean(params.new) && Boolean(params.service)) || Boolean(editing);
  const service = editing ? getCatalogService(editing.serviceKey) : getCatalogService(params.service);
  const activeKeys = new Set(subscriptions.filter((s) => s.status === "active" && s.serviceKey).map((s) => s.serviceKey!));
  const coveredBy = service ? bundlesContaining(service.key).filter((b) => activeKeys.has(b.key)).map((b) => b.name) : [];
  const overlaps = bundleOverlaps(subscriptions);
  const totals = computeTotals(subscriptions, currency, rates);
  const categories = [...new Set(subscriptions.map((s) => s.category).filter(Boolean) as string[])].sort();
  const currencies = [...new Set([currency, ...SUPPORTED_CURRENCIES])];

  const sorted = [...subscriptions].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return effectiveNextBillingDate(a, today).localeCompare(effectiveNextBillingDate(b, today));
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Подписки</h1>
          <p className="text-sm text-muted">
            {totals.activeCount} активных · {formatMoney(totals.monthly, currency)} в месяц · {formatMoney(totals.yearly, currency)} в год
          </p>
        </div>
        {!showForm && !picking ? (
          <Link href="/subscriptions?new=1" className={buttonClass("primary")}>
            <Plus className="size-4" aria-hidden /> Добавить подписку
          </Link>
        ) : null}
      </div>

      {picking ? (
        <Card>
          <CardHeader
            title="Выберите сервис"
            description="50 популярных сервисов: тариф и цена подставятся сами. Цены ориентировочные (сентябрь 2026)."
            action={
              <Link href="/subscriptions" className={buttonClass("ghost", "sm")}>
                Закрыть
              </Link>
            }
          />
          <CatalogPicker addedKeys={[...new Set(subscriptions.map((s) => s.serviceKey).filter(Boolean) as string[])]} />
        </Card>
      ) : null}

      {showForm ? (
        <Card>
          <CardHeader
            title={editing ? `Редактирование: ${editing.name}` : service ? `Новая подписка: ${service.name}` : "Свой сервис"}
            description={editing || service ? undefined : "Укажите стоимость, периодичность и дату следующего списания."}
          />
          <SubscriptionForm
            key={editing?.id ?? `new-${service?.key ?? "custom"}`}
            subscription={editing}
            service={service}
            coveredBy={coveredBy}
            currencies={currencies}
            defaultCurrency={currency}
            defaultDate={addDays(today, 30)}
            integrations={integrations.map((i) => ({ id: i.id, name: i.name }))}
            categories={categories}
          />
        </Card>
      ) : null}

      {overlaps.length ? (
        <Card className="border-warning/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning-ink" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium text-ink">Похоже, вы платите дважды</p>
              <ul className="mt-1 flex flex-col gap-1 text-sm text-ink-2">
                {overlaps.map(({ included, bundle, monthlyWaste }) => (
                  <li key={`${included.id}:${bundle.id}`}>
                    <b className="text-ink">{included.name}</b> уже входит в {bundle.name} — лишние{" "}
                    {formatMoney(monthlyWaste, included.currency)} в месяц.{" "}
                    <Link href={`/subscriptions?edit=${included.id}`} className="text-accent-strong hover:underline">
                      Открыть
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState
          title="Подписок пока нет"
          description="Выберите из каталога 50 популярных сервисов — Okko, Яндекс Плюс, Claude… — или добавьте свой."
          action={
            <Link href="/subscriptions?new=1" className={buttonClass("primary", "sm")}>
              Добавить подписку
            </Link>
          }
        />
      ) : (
        <Card className="relative overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Сервис</th>
                <th className="px-3 py-3 text-right font-medium">Стоимость</th>
                <th className="px-3 py-3 text-right font-medium">В месяц, {currency}</th>
                <th className="px-3 py-3 font-medium">Следующее списание</th>
                <th className="px-3 py-3 font-medium">Статус</th>
                <th className="px-5 py-3 text-right font-medium">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((s) => {
                const next = effectiveNextBillingDate(s, today);
                const daysLeft = diffInDays(today, next);
                const soon = s.status === "active" && daysLeft <= s.remindDaysBefore;
                return (
                  <tr key={s.id} className={s.status === "paused" ? "opacity-70" : undefined}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                      <ServiceAvatar name={s.name} serviceKey={s.serviceKey} size="sm" />
                      <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        {s.name}
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-muted hover:text-ink" aria-label={`Открыть биллинг ${s.name}`}>
                            <ExternalLink className="size-3.5" aria-hidden />
                          </a>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted">{s.category ?? "Без категории"}</div>
                      </div>
                      </div>
                    </td>
                    <td className="tabular px-3 py-3 text-right text-ink">
                      {formatMoney(s.cost, s.currency)}
                      <div className="text-xs text-muted">{CYCLE_LABELS[s.billingCycle]}</div>
                    </td>
                    <td className="tabular px-3 py-3 text-right text-ink-2">
                      {formatMoney(convert(monthlyEquivalent(s), s.currency, currency, rates), currency)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-ink">{formatDate(next)}</div>
                      <div className={soon ? "text-xs font-medium text-warning-ink" : "text-xs text-muted"}>{relativeDays(daysLeft)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.status === "active" ? <Badge tone="good">Активна</Badge> : <Badge>На паузе</Badge>}
                        {s.trialEndsAt && s.trialEndsAt >= today ? <Badge tone="accent">Пробный до {formatDate(s.trialEndsAt)}</Badge> : null}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Link href={`/subscriptions?edit=${s.id}`} className={buttonClass("ghost", "sm")} aria-label={`Редактировать ${s.name}`} title="Редактировать">
                          <Pencil className="size-4" aria-hidden />
                        </Link>
                        <ConfirmButton
                          action={toggleSubscriptionStatusAction.bind(null, s.id)}
                          label={s.status === "active" ? `Поставить ${s.name} на паузу` : `Возобновить ${s.name}`}
                          variant="ghost"
                        >
                          {s.status === "active" ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                        </ConfirmButton>
                        <ConfirmButton
                          action={deleteSubscriptionAction.bind(null, s.id)}
                          confirm={`Удалить подписку «${s.name}»?`}
                          label={`Удалить ${s.name}`}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
