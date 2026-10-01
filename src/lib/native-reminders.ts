import { buildAlerts } from "./alerts";
import { chargeDatesBetween } from "./billing";
import { formatMoney } from "./currency";
import { addDays, diffInDays, formatDate, pluralDays } from "./dates";
import type { Integration, ISODate, Subscription } from "./types";

/** Напоминание для Android-приложения: время ставит телефон (в своём часовом поясе). */
export interface NativeReminder {
  /** Стабильный ключ — из него приложение получает id уведомления. */
  key: string;
  /** День показа (YYYY-MM-DD) и час по местному времени телефона. */
  date: ISODate;
  hour: number;
  title: string;
  body: string;
  /** Куда открыть приложение по нажатию. */
  href: string;
  /** Показать сразу (текущая проблема: лимит, баланс), не дожидаясь даты. */
  immediate?: boolean;
}

export const REMINDER_HOUR = 10;
export const HORIZON_DAYS = 90;
/** Android ограничивает число будильников на приложение; берём с запасом. */
export const MAX_REMINDERS = 60;

function inDays(days: number): string {
  if (days <= 0) return "сегодня";
  if (days === 1) return "завтра";
  return `через ${pluralDays(days)}`;
}

/**
 * Расписание локальных уведомлений на ближайшие HORIZON_DAYS дней:
 * напоминания о списаниях и окончании пробных периодов + текущие критичные алерты.
 */
export function buildNativeReminders(
  subscriptions: Subscription[],
  integrations: Integration[],
  today: ISODate,
): NativeReminder[] {
  const until = addDays(today, HORIZON_DAYS);
  const reminders: NativeReminder[] = [];

  for (const s of subscriptions) {
    if (s.status !== "active") continue;
    for (const chargeDate of chargeDatesBetween(s, today, until)) {
      // Если день напоминания уже прошёл, а списание ещё впереди — напоминаем сегодня.
      const planned = addDays(chargeDate, -Math.max(0, s.remindDaysBefore));
      const remindOn = planned < today ? today : planned;
      const lead = diffInDays(remindOn, chargeDate);
      const money = formatMoney(s.cost, s.currency);
      const trial = s.trialEndsAt === chargeDate;
      reminders.push({
        key: `${trial ? "trial" : "charge"}:${s.id}:${chargeDate}`,
        date: remindOn,
        hour: REMINDER_HOUR,
        title: trial ? `${s.name}: пробный период заканчивается ${inDays(lead)}` : `${s.name}: списание ${inDays(lead)}`,
        body: trial
          ? `Затем спишется ${money} (${formatDate(chargeDate)}). Отмените заранее, если подписка не нужна.`
          : `${money} — ${formatDate(chargeDate)}`,
        href: `/subscriptions?edit=${s.id}`,
      });
    }
  }

  // Текущие критичные проблемы (лимит почти исчерпан, баланс на исходе) — один раз в день.
  for (const alert of buildAlerts([], integrations, today)) {
    if (alert.severity !== "critical") continue;
    reminders.push({
      key: `${alert.id}:${today}`,
      date: today,
      hour: REMINDER_HOUR,
      title: alert.title,
      body: alert.message,
      href: alert.href,
      immediate: true,
    });
  }

  return reminders
    .sort((a, b) => Number(Boolean(b.immediate)) - Number(Boolean(a.immediate)) || a.date.localeCompare(b.date))
    .slice(0, MAX_REMINDERS);
}

/** 31-битный положительный id уведомления из строкового ключа (FNV-1a). */
export function notificationId(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 1) || 1;
}
