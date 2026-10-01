import { requestJson, toNumber } from "./http";
import type { ProviderDefinition } from "./types";

/** OpenRouter: GET https://openrouter.ai/api/v1/credits — куплено и потрачено кредитов (USD). */
export const openrouterProvider: ProviderDefinition = {
  id: "openrouter",
  name: "OpenRouter",
  description: "Сколько кредитов потрачено из купленных (шкала использования).",
  docsUrl: "https://openrouter.ai/settings/keys",
  fields: [
    {
      key: "apiKey",
      label: "API-ключ",
      type: "password",
      secret: true,
      required: true,
      placeholder: "sk-or-…",
      help: "Подходит ключ управления (Management key) или обычный ключ.",
    },
  ],

  async fetchUsage({ secrets, fetch }) {
    const { data } = await requestJson<{ data?: { total_credits?: number; total_usage?: number } }>(
      fetch,
      "OpenRouter",
      "https://openrouter.ai/api/v1/credits",
      { headers: { Authorization: `Bearer ${secrets.apiKey}` } },
    );
    const total = toNumber(data?.total_credits);
    const used = toNumber(data?.total_usage);
    return {
      plan: null,
      metrics: [
        { key: "credits", label: "Потрачено кредитов", used: Math.round(used * 100) / 100, limit: total || null, unit: "usd" },
      ],
    };
  },
};
