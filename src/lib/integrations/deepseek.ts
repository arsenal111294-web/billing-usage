import { requestJson, toNumber } from "./http";
import { ProviderError, type ProviderDefinition } from "./types";

interface BalanceResponse {
  is_available?: boolean;
  balance_infos?: { currency?: string; total_balance?: string; granted_balance?: string; topped_up_balance?: string }[];
}

/** DeepSeek: GET https://api.deepseek.com/user/balance. */
export const deepseekProvider: ProviderDefinition = {
  id: "deepseek",
  name: "DeepSeek",
  description: "Остаток на балансе API (пополненный и бонусный).",
  docsUrl: "https://platform.deepseek.com/api_keys",
  fields: [{ key: "apiKey", label: "API-ключ", type: "password", secret: true, required: true, placeholder: "sk-…" }],

  async fetchUsage({ secrets, fetch }) {
    const body = await requestJson<BalanceResponse>(fetch, "DeepSeek", "https://api.deepseek.com/user/balance", {
      headers: { Authorization: `Bearer ${secrets.apiKey}` },
    });
    const infos = body.balance_infos ?? [];
    if (infos.length === 0) throw new ProviderError("DeepSeek: API не вернул баланс");
    return {
      plan: body.is_available === false ? "Баланса недостаточно для запросов" : null,
      metrics: infos.map((info) => {
        const currency = (info.currency ?? "USD").toUpperCase();
        return {
          key: `balance:${currency}`,
          label: "Баланс",
          used: toNumber(info.total_balance),
          limit: null,
          unit: currency === "CNY" ? ("cny" as const) : ("usd" as const),
          warnBelow: currency === "CNY" ? 10 : 1,
          note: toNumber(info.granted_balance) > 0 ? `из них бонусных: ${info.granted_balance}` : null,
        };
      }),
    };
  },
};
