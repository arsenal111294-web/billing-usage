import { monthStart, nextMonthStart, optionalNumber, requestJson, toNumber } from "./http";
import type { ProviderDefinition } from "./types";

const API = "https://api.anthropic.com/v1/organizations";
const HEADERS_BASE = { "anthropic-version": "2023-06-01" };

interface Page<T> {
  data: { starting_at: string; ending_at: string; results: T[] }[];
  has_more: boolean;
  next_page: string | null;
}

interface CostResult {
  /** Сумма в центах (USD) десятичной строкой. */
  amount: string;
  currency: string;
}

interface UsageResult {
  uncached_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number };
  output_tokens?: number;
}

/** Обходит все страницы отчёта (Usage & Cost Admin API отдаёт до 31 дневного бакета на страницу). */
async function collect<T>(fetchImpl: typeof fetch, url: string, headers: Record<string, string>): Promise<T[]> {
  const results: T[] = [];
  let page: string | null = null;
  for (let i = 0; i < 10; i++) {
    const pageUrl: string = page ? `${url}&page=${encodeURIComponent(page)}` : url;
    const body: Page<T> = await requestJson<Page<T>>(fetchImpl, "Anthropic", pageUrl, { headers });
    for (const bucket of body.data) results.push(...bucket.results);
    if (!body.has_more || !body.next_page) break;
    page = body.next_page;
  }
  return results;
}

export const anthropicProvider: ProviderDefinition = {
  id: "anthropic",
  name: "Anthropic (Claude API)",
  description:
    "Расходы и токены за текущий месяц через Usage & Cost Admin API. Подписки Claude.ai (Pro/Max) добавляйте вручную.",
  docsUrl: "https://console.anthropic.com/settings/admin-keys",
  fields: [
    {
      key: "adminKey",
      label: "Admin API key",
      type: "password",
      secret: true,
      required: true,
      placeholder: "sk-ant-admin01-…",
      help: "Нужен именно Admin-ключ организации: обычные API-ключи не имеют доступа к отчётам.",
    },
    {
      key: "monthlyBudget",
      label: "Месячный бюджет, $",
      type: "number",
      secret: false,
      required: false,
      placeholder: "50",
      help: "Используется как лимит для индикатора расходов.",
    },
  ],

  async fetchUsage({ secrets, config, fetch, now }) {
    const headers = { ...HEADERS_BASE, "x-api-key": secrets.adminKey };
    const from = monthStart(now).toISOString();
    const qs = `starting_at=${encodeURIComponent(from)}&bucket_width=1d&limit=31`;

    const [costs, usage] = await Promise.all([
      collect<CostResult>(fetch, `${API}/cost_report?${qs}`, headers),
      collect<UsageResult>(fetch, `${API}/usage_report/messages?${qs}`, headers),
    ]);

    const costUsd = costs.reduce((sum, r) => sum + toNumber(r.amount), 0) / 100;
    let input = 0;
    let output = 0;
    let cached = 0;
    for (const r of usage) {
      input +=
        (r.uncached_input_tokens ?? 0) +
        (r.cache_creation?.ephemeral_5m_input_tokens ?? 0) +
        (r.cache_creation?.ephemeral_1h_input_tokens ?? 0);
      cached += r.cache_read_input_tokens ?? 0;
      output += r.output_tokens ?? 0;
    }

    const budget = optionalNumber(config.monthlyBudget);
    const resetsAt = nextMonthStart(now).toISOString();
    return {
      plan: budget ? `Бюджет $${budget}/мес` : "Pay as you go",
      periodStart: from,
      periodEnd: resetsAt,
      metrics: [
        { key: "cost_month", label: "Расходы за месяц", used: Math.round(costUsd * 100) / 100, limit: budget, unit: "usd", resetsAt },
        { key: "input_tokens", label: "Входные токены", used: input, limit: null, unit: "tokens" },
        { key: "cache_read_tokens", label: "Токены из кэша", used: cached, limit: null, unit: "tokens" },
        { key: "output_tokens", label: "Выходные токены", used: output, limit: null, unit: "tokens" },
      ],
    };
  },
};
