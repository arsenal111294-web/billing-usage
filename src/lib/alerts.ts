import { dueReminders } from "./billing";
import { formatMoney } from "./currency";
import { formatDate, relativeDays } from "./dates";
import { formatMetricValue, formatPercent, usageRatio } from "./format";
import type { Integration, ISODate, Subscription, UsageMetric } from "./types";

export const LIMIT_WARNING = 0.8;
export const LIMIT_CRITICAL = 0.95;

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  kind: "charge" | "limit" | "integration";
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
      const ratio = usageRatio(metric);
      if (ratio !== null && ratio >= threshold) breaches.push({ integration, metric, ratio });
    }
  }
  return breaches.sort((a, b) => b.ratio - a.ratio);
}

export function buildAlerts(subscriptions: Subscription[], integrations: Integration[], today: ISODate): Alert[] {
  const alerts: Alert[] = [];

  for (const { subscription: s, date, daysLeft } of dueReminders(subscriptions, today)) {
    alerts.push({
      id: `charge:${s.id}:${date}`,
      kind: "charge",
      severity: daysLeft <= 1 ? "critical" : "warning",
      title: `${s.name}: списание ${relativeDays(daysLeft)}`,
      message: `${formatMoney(s.cost, s.currency)} будет списано ${formatDate(date)}.`,
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
