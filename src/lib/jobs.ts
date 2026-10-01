import "server-only";
import { effectiveNextBillingDate } from "./billing";
import { todayISO } from "./dates";
import { getRepository } from "./db";
import { syncAllIntegrations, toPublicIntegration } from "./integrations/service";
import { dispatchReminders } from "./notifications";

/**
 * Ежедневная задача:
 * 1) переносит прошедшие даты списаний на следующий период;
 * 2) синхронизирует лимиты всех интеграций;
 * 3) рассылает напоминания о списаниях и исчерпании лимитов.
 */
export async function runDailyCheck(now = new Date()) {
  const repo = getRepository();
  const today = todayISO(now);

  const subscriptions = await repo.listSubscriptions();
  let rolled = 0;
  for (const sub of subscriptions) {
    const next = effectiveNextBillingDate(sub, today);
    if (next !== sub.nextBillingDate) {
      Object.assign(sub, await repo.updateSubscription(sub.id, { nextBillingDate: next }));
      rolled++;
    }
  }

  const sync = await syncAllIntegrations(now);
  const integrations = (await repo.listIntegrations()).map(toPublicIntegration);
  const notifications = await dispatchReminders(subscriptions, integrations, today);

  return { today, rolledSubscriptions: rolled, sync, notifications };
}
