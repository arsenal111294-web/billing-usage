import { requestJson, toNumber } from "./http";
import type { ProviderDefinition } from "./types";
import type { MetricUnit } from "../types";

interface Finances {
  balance?: number | string;
  currency?: string;
  monthly_cost?: number | string;
  hours_left?: number | string | null;
  total_paid?: number | string;
}

/** Timeweb Cloud: GET /api/v1/account/finances (https://timeweb.cloud/api-docs). */
export const timewebProvider: ProviderDefinition = {
  id: "timeweb",
  name: "Timeweb Cloud",
  description: "Баланс, расход в месяц и на сколько дней хватит денег на счёте.",
  docsUrl: "https://timeweb.cloud/my/api-keys",
  fields: [{ key: "token", label: "API-токен", type: "password", secret: true, required: true, placeholder: "eyJ…" }],

  async fetchUsage({ secrets, fetch }) {
    const { finances } = await requestJson<{ finances: Finances }>(fetch, "Timeweb Cloud", "https://api.timeweb.cloud/api/v1/account/finances", {
      headers: { Authorization: `Bearer ${secrets.token}` },
    });
    const unit: MetricUnit = (finances.currency ?? "RUB").toUpperCase() === "RUB" ? "rub" : "usd";
    const hoursLeft = finances.hours_left === null || finances.hours_left === undefined ? null : toNumber(finances.hours_left);
    return {
      plan: null,
      metrics: [
        { key: "balance", label: "Баланс", used: toNumber(finances.balance), limit: null, unit },
        { key: "monthly_cost", label: "Расход в месяц", used: toNumber(finances.monthly_cost), limit: null, unit },
        ...(hoursLeft !== null
          ? [{ key: "days_left", label: "Денег хватит на", used: Math.floor(hoursLeft / 24), limit: null, unit: "days" as const, warnBelow: 7 }]
          : []),
      ],
    };
  },
};
