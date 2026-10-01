import { formatMoney } from "./currency";
import type { MetricUnit, UsageMetric } from "./types";

const compact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

export function formatBytes(bytes: number): string {
  const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${plain.format(value)} ${units[i]}`;
}

export function formatMetricValue(value: number, unit: MetricUnit): string {
  switch (unit) {
    case "usd":
      return formatMoney(value, "USD");
    case "bytes":
      return formatBytes(value);
    case "minutes":
      return `${plain.format(value)} мин`;
    case "tokens":
      return `${compact.format(value)} ток.`;
    case "requests":
      return `${compact.format(value)} запр.`;
    default:
      return compact.format(value);
  }
}

/** Доля использования лимита 0..1+ или null, если лимита нет. */
export function usageRatio(metric: Pick<UsageMetric, "used" | "limit">): number | null {
  if (!metric.limit || metric.limit <= 0) return null;
  return metric.used / metric.limit;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
