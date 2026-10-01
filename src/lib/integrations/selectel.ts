import { requestJson, toNumber } from "./http";
import { ProviderError, type ProviderDefinition } from "./types";
import type { MetricUnit, UsageMetric } from "../types";

interface BalancesResponse {
  data?: {
    settings?: { currency?: string };
    billings?: { billing_type?: string; final_sum?: number; debt_sum?: number }[];
  };
}

/** Selectel: GET https://api.selectel.ru/v3/balances, суммы — в копейках (https://docs.selectel.ru/api/balance/). */
export const selectelProvider: ProviderDefinition = {
  id: "selectel",
  name: "Selectel",
  description: "Баланс и задолженность по счёту (статический API-ключ X-Token).",
  docsUrl: "https://my.selectel.ru/profile/apikeys",
  fields: [{ key: "token", label: "API-ключ (X-Token)", type: "password", secret: true, required: true }],

  async fetchUsage({ secrets, fetch }) {
    const body = await requestJson<BalancesResponse>(fetch, "Selectel", "https://api.selectel.ru/v3/balances", {
      headers: { "X-Token": secrets.token },
    });
    const billings = body.data?.billings ?? [];
    if (billings.length === 0) throw new ProviderError("Selectel: API не вернул данных о балансе");
    const unit: MetricUnit = (body.data?.settings?.currency ?? "rub").toLowerCase() === "rub" ? "rub" : "usd";
    const balance = billings.reduce((sum, b) => sum + toNumber(b.final_sum), 0) / 100;
    const debt = billings.reduce((sum, b) => sum + toNumber(b.debt_sum), 0) / 100;
    const metrics: UsageMetric[] = [{ key: "balance", label: "Баланс", used: balance, limit: null, unit, warnBelow: 500 }];
    if (debt > 0) metrics.push({ key: "debt", label: "Задолженность", used: debt, limit: null, unit });
    return { plan: null, metrics };
  },
};
