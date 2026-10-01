import { requestJson, toNumber } from "./http";
import { ProviderError, type ProviderDefinition } from "./types";
import type { UsageMetric } from "../types";

interface BillingAccount {
  id: string;
  name: string;
  currency?: string;
  active?: boolean;
  balance?: string;
}

/**
 * Yandex Cloud: OAuth-токен меняется на IAM-токен, затем читаются платёжные аккаунты.
 * https://yandex.cloud/ru/docs/billing/api-ref/BillingAccount/list
 */
export const yandexCloudProvider: ProviderDefinition = {
  id: "yandex_cloud",
  name: "Yandex Cloud",
  description: "Баланс платёжных аккаунтов (OAuth-токен Яндекс ID).",
  docsUrl: "https://yandex.cloud/ru/docs/iam/concepts/authorization/oauth-token",
  fields: [{ key: "oauthToken", label: "OAuth-токен", type: "password", secret: true, required: true, placeholder: "y0_…" }],

  async fetchUsage({ secrets, fetch }) {
    const { iamToken } = await requestJson<{ iamToken: string }>(fetch, "Yandex Cloud", "https://iam.api.cloud.yandex.net/iam/v1/tokens", {
      method: "POST",
      body: { yandexPassportOauthToken: secrets.oauthToken },
    });
    const { billingAccounts = [] } = await requestJson<{ billingAccounts?: BillingAccount[] }>(
      fetch,
      "Yandex Cloud",
      "https://billing.api.cloud.yandex.net/billing/v1/billingAccounts",
      { headers: { Authorization: `Bearer ${iamToken}` } },
    );
    if (billingAccounts.length === 0) throw new ProviderError("Yandex Cloud: у аккаунта нет платёжных аккаунтов");
    const metrics: UsageMetric[] = billingAccounts.map((account) => ({
      key: `balance:${account.id}`,
      label: billingAccounts.length > 1 ? `Баланс «${account.name}»` : "Баланс",
      used: toNumber(account.balance),
      limit: null,
      unit: (account.currency ?? "RUB").toUpperCase() === "RUB" ? "rub" : "usd",
      warnBelow: 500,
      note: account.active === false ? "Платёжный аккаунт неактивен" : null,
    }));
    return { plan: null, metrics };
  },
};
