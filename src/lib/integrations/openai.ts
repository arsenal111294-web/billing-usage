import { monthStart, nextMonthStart, optionalNumber, requestJson, toNumber } from "./http";
import type { ProviderDefinition } from "./types";

const API = "https://api.openai.com/v1/organization";

interface Page<T> {
  data: { start_time: number; end_time: number; results: T[] }[];
  has_more: boolean;
  next_page: string | null;
}

interface CostResult {
  amount?: { value?: number | string; currency?: string };
}

interface CompletionsResult {
  input_tokens?: number;
  output_tokens?: number;
  input_cached_tokens?: number;
}

async function collect<T>(fetchImpl: typeof fetch, url: string, headers: Record<string, string>): Promise<T[]> {
  const results: T[] = [];
  let page: string | null = null;
  for (let i = 0; i < 10; i++) {
    const pageUrl: string = page ? `${url}&page=${encodeURIComponent(page)}` : url;
    const body: Page<T> = await requestJson<Page<T>>(fetchImpl, "OpenAI", pageUrl, { headers });
    for (const bucket of body.data) results.push(...bucket.results);
    if (!body.has_more || !body.next_page) break;
    page = body.next_page;
  }
  return results;
}

export const openaiProvider: ProviderDefinition = {
  id: "openai",
  name: "OpenAI",
  description: "Расходы и токены за текущий месяц через Organization Costs/Usage API.",
  docsUrl: "https://platform.openai.com/settings/organization/admin-keys",
  fields: [
    { key: "adminKey", label: "Admin API key", type: "password", secret: true, required: true, placeholder: "sk-admin-…" },
    {
      key: "monthlyBudget",
      label: "Месячный бюджет, $",
      type: "number",
      secret: false,
      required: false,
      placeholder: "50",
    },
  ],

  async fetchUsage({ secrets, config, fetch, now }) {
    const headers = { Authorization: `Bearer ${secrets.adminKey}` };
    const from = monthStart(now);
    const qs = `start_time=${Math.floor(from.getTime() / 1000)}&bucket_width=1d&limit=31`;

    const [costs, usage] = await Promise.all([
      collect<CostResult>(fetch, `${API}/costs?${qs}`, headers),
      collect<CompletionsResult>(fetch, `${API}/usage/completions?${qs}`, headers),
    ]);

    const costUsd = costs.reduce((sum, r) => sum + toNumber(r.amount?.value), 0);
    const input = usage.reduce((sum, r) => sum + (r.input_tokens ?? 0), 0);
    const output = usage.reduce((sum, r) => sum + (r.output_tokens ?? 0), 0);
    const budget = optionalNumber(config.monthlyBudget);
    const resetsAt = nextMonthStart(now).toISOString();

    return {
      plan: budget ? `Бюджет $${budget}/мес` : "Pay as you go",
      periodStart: from.toISOString(),
      periodEnd: resetsAt,
      metrics: [
        { key: "cost_month", label: "Расходы за месяц", used: Math.round(costUsd * 100) / 100, limit: budget, unit: "usd", resetsAt },
        { key: "input_tokens", label: "Входные токены", used: input, limit: null, unit: "tokens" },
        { key: "output_tokens", label: "Выходные токены", used: output, limit: null, unit: "tokens" },
      ],
    };
  },
};
