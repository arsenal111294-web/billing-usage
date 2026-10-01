import { requestJson, toNumber } from "./http";
import { ProviderError, type ProviderDefinition } from "./types";

interface AccountInfoResponse {
  status?: string;
  error_text?: string;
  answer?: {
    status?: string;
    errors?: { error_text?: string }[];
    result?: {
      plan_name?: string;
      user_balance?: number | string;
      user_days_to_block?: number | string;
      user_rate_month?: number | string;
    };
  };
}

/** Beget: user/getAccountInfo (https://beget.com/ru/kb/api/funkczii-upravleniya-akkauntom). */
export const begetProvider: ProviderDefinition = {
  id: "beget",
  name: "Beget",
  description: "Баланс, тариф и сколько дней осталось до блокировки.",
  docsUrl: "https://cp.beget.com/settings/access",
  fields: [
    { key: "login", label: "Логин", type: "text", secret: false, required: true },
    {
      key: "apiPassword",
      label: "Пароль API",
      type: "password",
      secret: true,
      required: true,
      help: "Отдельный пароль для API из панели: Настройки → Доступ к API.",
    },
  ],

  async fetchUsage({ secrets, config, fetch }) {
    const qs = new URLSearchParams({ login: config.login ?? "", passwd: secrets.apiPassword, output_format: "json" });
    const body = await requestJson<AccountInfoResponse>(fetch, "Beget", `https://api.beget.com/api/user/getAccountInfo?${qs}`);
    const result = body.answer?.result;
    if (body.status !== "success" || body.answer?.status !== "success" || !result) {
      const reason = body.error_text ?? body.answer?.errors?.[0]?.error_text ?? "неверный логин или пароль API";
      throw new ProviderError(`Beget: ${reason}`);
    }
    return {
      plan: result.plan_name ?? null,
      metrics: [
        { key: "balance", label: "Баланс", used: toNumber(result.user_balance), limit: null, unit: "rub" },
        { key: "days_left", label: "До блокировки", used: toNumber(result.user_days_to_block), limit: null, unit: "days", warnBelow: 7 },
        ...(result.user_rate_month !== undefined
          ? [{ key: "monthly_cost", label: "Тариф в месяц", used: toNumber(result.user_rate_month), limit: null, unit: "rub" as const }]
          : []),
      ],
    };
  },
};
