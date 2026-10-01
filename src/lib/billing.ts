import { convert, type Rates } from "./currency";
import { addMonths, diffInDays, monthKey, parseISODate, toISODate } from "./dates";
import type { BillingCycle, ISODate, Subscription } from "./types";

const CYCLE_MONTHS: Record<BillingCycle, number> = { monthly: 1, yearly: 12 };

export const CYCLE_LABELS: Record<BillingCycle, string> = { monthly: "в месяц", yearly: "в год" };

/**
 * Ближайшая дата списания не раньше `today`. Если сохранённая дата уже прошла
 * (например, крон не запускался), «прокручиваем» её вперёд по периодичности,
 * сохраняя исходный день месяца.
 */
export function effectiveNextBillingDate(sub: Pick<Subscription, "nextBillingDate" | "billingCycle">, today: ISODate): ISODate {
  return addMonths(sub.nextBillingDate, firstPeriodIndex(sub, today) * CYCLE_MONTHS[sub.billingCycle]);
}

/** Номер первого периода k, для которого nextBillingDate + k·период >= from. */
function firstPeriodIndex(sub: Pick<Subscription, "nextBillingDate" | "billingCycle">, from: ISODate): number {
  const step = CYCLE_MONTHS[sub.billingCycle];
  let k = 0;
  while (addMonths(sub.nextBillingDate, k * step) < from) k += 1;
  return k;
}

/** Все даты списаний в полуинтервале [from, to). */
export function chargeDatesBetween(
  sub: Pick<Subscription, "nextBillingDate" | "billingCycle">,
  from: ISODate,
  to: ISODate,
): ISODate[] {
  const step = CYCLE_MONTHS[sub.billingCycle];
  const dates: ISODate[] = [];
  // Якорь — исходная дата, чтобы день месяца не «сползал» после коротких месяцев.
  for (let k = firstPeriodIndex(sub, from); ; k++) {
    const date = addMonths(sub.nextBillingDate, k * step);
    if (date >= to) break;
    dates.push(date);
  }
  return dates;
}

export function monthlyEquivalent(sub: Pick<Subscription, "cost" | "billingCycle">): number {
  return sub.cost / CYCLE_MONTHS[sub.billingCycle];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface SpendTotals {
  currency: string;
  monthly: number;
  yearly: number;
  activeCount: number;
  pausedCount: number;
  byCategory: { category: string; monthly: number }[];
}

export function computeTotals(subs: Subscription[], currency: string, rates: Rates): SpendTotals {
  const active = subs.filter((s) => s.status === "active");
  const byCategory = new Map<string, number>();
  let monthly = 0;
  for (const sub of active) {
    const value = convert(monthlyEquivalent(sub), sub.currency, currency, rates);
    monthly += value;
    const category = sub.category?.trim() || "Без категории";
    byCategory.set(category, (byCategory.get(category) ?? 0) + value);
  }
  return {
    currency,
    monthly: round2(monthly),
    yearly: round2(monthly * 12),
    activeCount: active.length,
    pausedCount: subs.length - active.length,
    byCategory: [...byCategory.entries()]
      .map(([category, value]) => ({ category, monthly: round2(value) }))
      .sort((a, b) => b.monthly - a.monthly),
  };
}

export interface ForecastMonth {
  month: string; // YYYY-MM
  total: number;
  byCategory: Record<string, number>;
}

/** Прогноз фактических списаний по месяцам (годовые подписки попадают в месяц оплаты). */
export function forecastCharges(
  subs: Subscription[],
  today: ISODate,
  currency: string,
  rates: Rates,
  months = 12,
): ForecastMonth[] {
  const start = parseISODate(today);
  start.setUTCDate(1);
  const from = toISODate(start);
  const to = addMonths(from, months);

  const buckets: ForecastMonth[] = Array.from({ length: months }, (_, i) => ({
    month: monthKey(addMonths(from, i)),
    total: 0,
    byCategory: {},
  }));
  const index = new Map(buckets.map((b, i) => [b.month, i]));

  for (const sub of subs) {
    if (sub.status !== "active") continue;
    const amount = convert(sub.cost, sub.currency, currency, rates);
    const category = sub.category?.trim() || "Без категории";
    // Списания текущего месяца, уже прошедшие до today, считаем состоявшимися.
    for (const date of chargeDatesBetween(sub, from, to)) {
      const bucket = buckets[index.get(monthKey(date))!];
      bucket.total += amount;
      bucket.byCategory[category] = (bucket.byCategory[category] ?? 0) + amount;
    }
  }

  for (const bucket of buckets) {
    bucket.total = round2(bucket.total);
    for (const key of Object.keys(bucket.byCategory)) bucket.byCategory[key] = round2(bucket.byCategory[key]);
  }
  return buckets;
}

export interface UpcomingCharge {
  subscription: Subscription;
  date: ISODate;
  daysLeft: number;
}

export function upcomingCharges(subs: Subscription[], today: ISODate, withinDays: number): UpcomingCharge[] {
  return subs
    .filter((s) => s.status === "active")
    .map((subscription) => {
      const date = effectiveNextBillingDate(subscription, today);
      return { subscription, date, daysLeft: diffInDays(today, date) };
    })
    .filter((c) => c.daysLeft <= withinDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Подписки, по которым пора напомнить (с учётом индивидуального remindDaysBefore). */
export function dueReminders(subs: Subscription[], today: ISODate): UpcomingCharge[] {
  return upcomingCharges(subs, today, 30).filter((c) => c.daysLeft <= c.subscription.remindDaysBefore);
}
