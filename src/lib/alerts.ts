import { dueReminders } from "./billing";
import { bundleOverlaps } from "./bundles";
import { formatMoney } from "./currency";
import { formatDate, relativeDays } from "./dates";
import { formatMetricValue, formatPercent, usageRatio } from "./format";
import type { Integration, ISODate, Subscription, UsageMetric } from "./types";

export const LIMIT_WARNING = 0.8;
export const LIMIT_CRITICAL = 0.95;

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  kind: "charge" | "trial" | "limit" | "balance" | "duplicate" | "integration";
  severity: AlertSeverity;
  title: string;
  message: string;
  href: string;
}

export interface LimitBreach {
  integration: Pick<Integration, "id" | "name" | "provider">;
  metric: UsageMetric;
  ratio: number;
}

export function limitBreaches(integrations: Integration[], threshold = LIMIT_WARNING): LimitBreach[] {
  const breaches: LimitBreach[] = [];
  for (const integration of integrations) {
    for (const metric of integration.usage?.metrics ?? []) {
      if (metric.alerting === false) continue;
      const ratio = usageRatio(metric);
      if (ratio !== null && ratio >= threshold) breaches.push({ integration, metric, ratio });
    }
  }
  return breaches.sort((a, b) => b.ratio - a.ratio);
}

/** Остатки (баланс, дни до блокировки), опустившиеся до порога warnBelow. */
export function lowBalances(integrations: Integration[]): { integration: Integration; metric: UsageMetric }[] {
  const result: { integration: Integration; metric: UsageMetric }[] = [];
  for (const integration of integrations) {
    for (const metric of integration.usage?.metrics ?? []) {
      if (metric.alerting === false || metric.warnBelow === undefined) continue;
      if (metric.used <= metric.warnBelow) result.push({ integration, metric });
    }
  }
  return result;
}

export function buildAlerts(subscriptions: Subscription[], integrations: Integration[], today: ISODate): Alert[] {
  const alerts: Alert[] = [];

  for (const { subscription: s, date, daysLeft } of dueReminders(subscriptions, today)) {
    const trialEnds = s.trialEndsAt === date;
    alerts.push({
      id: `charge:${s.id}:${date}`,
      kind: trialEnds ? "trial" : "charge",
      severity: daysLeft <= 1 ? "critical" : "warning",
      title: trialEnds
        ? `${s.name}: пробный период заканчивается ${relativeDays(daysLeft)}`
        : `${s.name}: списание ${relativeDays(daysLeft)}`,
      message: trialEnds
        ? `Затем спишется ${formatMoney(s.cost, s.currency)} (${formatDate(date)}). Отмените заранее, если подписка не нужна.`
        : `${formatMoney(s.cost, s.currency)} будет списано ${formatDate(date)}.`,
      href: `/subscriptions?edit=${s.id}`,
    });
  }

  for (const { integration, metric, ratio } of limitBreaches(integrations)) {
    alerts.push({
      id: `limit:${integration.id}:${metric.key}`,
      kind: "limit",
      severity: ratio >= LIMIT_CRITICAL ? "critical" : "warning",
      title: `${integration.name}: ${metric.label} — ${formatPercent(ratio)}`,
      message: `Использовано ${formatMetricValue(metric.used, metric.unit)} из ${formatMetricValue(metric.limit!, metric.unit)}.`,
      href: "/integrations",
    });
  }

  for (const { integration, metric } of lowBalances(integrations)) {
    const critical = metric.used <= (metric.warnBelow ?? 0) / 3;
    alerts.push({
      id: `balance:${integration.id}:${metric.key}`,
      kind: "balance",
      severity: critical ? "critical" : "warning",
      title: `${integration.name}: ${metric.label.toLowerCase()} — ${formatMetricValue(metric.used, metric.unit)}`,
      message: "Пополните баланс, чтобы сервисы не остановились.",
      href: "/integrations",
    });
  }

  for (const { included, bundle, monthlyWaste } of bundleOverlaps(subscriptions)) {
    alerts.push({
      id: `duplicate:${included.id}:${bundle.id}`,
      kind: "duplicate",
      severity: "info",
      title: `${included.name} уже входит в ${bundle.name}`,
      message: `Возможно, вы платите дважды — можно сэкономить ${formatMoney(monthlyWaste, included.currency)} в месяц.`,
      href: `/subscriptions?edit=${included.id}`,
    });
  }

  for (const integration of integrations) {
    if (integration.status !== "error") continue;
    alerts.push({
      id: `integration:${integration.id}`,
      kind: "integration",
      severity: "info",
      title: `${integration.name}: ошибка синхронизации`,
      message: integration.lastError ?? "Не удалось получить данные",
      href: "/integrations",
    });
  }

  const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
