import "server-only";
import { LIMIT_CRITICAL, limitBreaches, type LimitBreach } from "../alerts";
import { dueReminders, type UpcomingCharge } from "../billing";
import { getRepository } from "../db";
import { env } from "../env";
import type { Integration, ISODate, NotificationChannel, Subscription } from "../types";
import { channelStatuses, SENDERS } from "./channels";
import { renderDigest } from "./templates";

export interface DispatchResult {
  channel: NotificationChannel;
  sent: boolean;
  charges: number;
  limits: number;
  error?: string;
}

const chargeKey = (c: UpcomingCharge, channel: NotificationChannel) =>
  `charge:${c.subscription.id}:${c.date}:${channel}`;
// Лимиты напоминаем не чаще раза в день на метрику.
const limitKey = (l: LimitBreach, today: ISODate, channel: NotificationChannel) =>
  `limit:${l.integration.id}:${l.metric.key}:${today}:${channel}`;

/**
 * Отправляет дайджест по всем настроенным каналам. Каждое напоминание отправляется
 * в канал один раз (дедупликация через notification_log), при ошибке запись откатывается.
 */
export async function dispatchReminders(
  subscriptions: Subscription[],
  integrations: Integration[],
  today: ISODate,
): Promise<DispatchResult[]> {
  const repo = getRepository();
  const charges = dueReminders(subscriptions, today);
  const limits = limitBreaches(integrations, LIMIT_CRITICAL);
  const results: DispatchResult[] = [];

  for (const { channel, configured } of channelStatuses()) {
    if (!configured) continue;

    const claimed: string[] = [];
    const newCharges: UpcomingCharge[] = [];
    const newLimits: LimitBreach[] = [];
    for (const c of charges) {
      const key = chargeKey(c, channel);
      if (await repo.claimNotification({ dedupeKey: key, kind: "charge", channel, subscriptionId: c.subscription.id })) {
        claimed.push(key);
        newCharges.push(c);
      }
    }
    for (const l of limits) {
      const key = limitKey(l, today, channel);
      if (await repo.claimNotification({ dedupeKey: key, kind: "limit", channel, integrationId: l.integration.id })) {
        claimed.push(key);
        newLimits.push(l);
      }
    }

    if (newCharges.length === 0 && newLimits.length === 0) {
      results.push({ channel, sent: false, charges: 0, limits: 0 });
      continue;
    }

    try {
      await SENDERS[channel](renderDigest({ charges: newCharges, limits: newLimits, appUrl: env.appUrl }));
      results.push({ channel, sent: true, charges: newCharges.length, limits: newLimits.length });
    } catch (error) {
      await Promise.all(claimed.map((key) => repo.releaseNotification(key)));
      results.push({
        channel,
        sent: false,
        charges: newCharges.length,
        limits: newLimits.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}

/** Тестовое сообщение без дедупликации — для проверки настроек канала. */
export async function sendTestNotification(
  channel: NotificationChannel,
  subscriptions: Subscription[],
  today: ISODate,
): Promise<void> {
  const status = channelStatuses().find((c) => c.channel === channel);
  if (!status?.configured) throw new Error(`Канал не настроен: задайте ${status?.missing.join(", ")}`);
  const charges = dueReminders(subscriptions, today);
  const message = renderDigest({ charges, limits: [], appUrl: env.appUrl });
  await SENDERS[channel]({
    ...message,
    subject: `[Тест] ${message.subject}`,
    telegram: `🧪 <i>Тестовое уведомление</i>\n\n${message.telegram}`,
  });
}

export { channelStatuses } from "./channels";
export { renderDigest } from "./templates";
