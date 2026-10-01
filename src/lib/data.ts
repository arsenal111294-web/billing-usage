import "server-only";
import { cache } from "react";
import { buildAlerts } from "./alerts";
import { parseRates } from "./currency";
import { todayISO } from "./dates";
import { getRepository } from "./db";
import { env } from "./env";
import { toPublicIntegration } from "./integrations/service";

/** Общая загрузка данных для страниц; cache() дедуплицирует вызовы в пределах одного запроса. */
export const loadAppData = cache(async () => {
  const repo = getRepository();
  const [subscriptions, integrationRecords] = await Promise.all([repo.listSubscriptions(), repo.listIntegrations()]);
  const integrations = integrationRecords.map(toPublicIntegration);
  const today = todayISO();
  return {
    today,
    subscriptions,
    integrations,
    alerts: buildAlerts(subscriptions, integrations, today),
    currency: env.baseCurrency,
    rates: parseRates(env.exchangeRates),
  };
});
