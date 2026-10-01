import type { ISODate } from "./types";

/**
 * Даты подписок — это календарные дни без времени. Все вычисления ведём в UTC,
 * чтобы часовой пояс сервера не сдвигал дату списания.
 */

export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function addDays(value: ISODate, days: number): ISODate {
  const date = parseISODate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

/** Добавляет месяцы, «прижимая» день к концу месяца (31 янв + 1 мес = 28/29 фев). */
export function addMonths(value: ISODate, months: number): ISODate {
  const date = parseISODate(value);
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return toISODate(target);
}

export function diffInDays(from: ISODate, to: ISODate): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000);
}

export function monthKey(value: ISODate): string {
  return value.slice(0, 7);
}

const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
}

export function formatDate(value: ISODate): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    parseISODate(value),
  );
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return `${n} дней`;
  if (last === 1) return `${n} день`;
  if (last >= 2 && last <= 4) return `${n} дня`;
  return `${n} дней`;
}

export function relativeDays(days: number): string {
  if (days === 0) return "сегодня";
  if (days === 1) return "завтра";
  if (days < 0) return `${pluralDays(-days)} назад`;
  return `через ${pluralDays(days)}`;
}
