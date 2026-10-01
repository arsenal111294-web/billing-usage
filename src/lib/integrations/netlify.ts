import { requestJson, toNumber } from "./http";
import { ProviderError, type ProviderDefinition } from "./types";
import type { UsageMetric } from "../types";

const API = "https://api.netlify.com/api/v1";
const GB = 1024 ** 3;

interface NetlifyAccount {
  id: string;
  slug: string;
  name: string;
  type_name?: string;
  capabilities?: Record<string, { included?: number | string; used?: number | string }>;
}

interface NetlifyBuildStatus {
  minutes?: {
    current?: number;
    included_minutes?: string | number;
    included_minutes_with_packs?: string | number;
    period_start_date?: string;
    period_end_date?: string;
  };
}

interface NetlifyBandwidth {
  used?: number;
  included?: number;
  period_start_date?: string;
  period_end_date?: string;
}

interface NetlifySite {
  id: string;
  name: string;
}

interface NetlifyDeploy {
  state: string;
  created_at: string;
}

/**
 * Месячные пакеты кредитов на тарифах с оплатой кредитами (с сентября 2025).
 * https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/
 */
const PLAN_CREDITS: Record<string, number> = { free: 300, personal: 1000, pro: 3000 };

/** Стоимость в кредитах: 15 за production-деплой, 20 за ГБ трафика. */
const CREDITS_PER_DEPLOY = 15;
const CREDITS_PER_GB = 20;

/** Сколько сайтов максимум опрашивать на деплои, чтобы не упереться в лимиты API. */
const MAX_SITES_FOR_DEPLOYS = 25;

export const netlifyProvider: ProviderDefinition = {
  id: "netlify",
  name: "Netlify",
  description: "Кредиты, минуты сборки, трафик и число сайтов команды (Personal Access Token).",
  docsUrl: "https://app.netlify.com/user/applications#personal-access-tokens",
  fields: [
    { key: "token", label: "Personal Access Token", type: "password", secret: true, required: true, placeholder: "nfp_…" },
    {
      key: "accountSlug",
      label: "Slug команды",
      type: "text",
      secret: false,
      required: false,
      placeholder: "my-team",
      help: "Если не указан — используется первая команда аккаунта.",
    },
  ],

  async fetchUsage({ secrets, config, fetch, now }) {
    const headers = { Authorization: `Bearer ${secrets.token}` };
    const accounts = await requestJson<NetlifyAccount[]>(fetch, "Netlify", `${API}/accounts`, { headers });
    const account = config.accountSlug ? accounts.find((a) => a.slug === config.accountSlug) : accounts[0];
    if (!account) {
      throw new ProviderError(
        config.accountSlug ? `Netlify: команда «${config.accountSlug}» не найдена` : "Netlify: у токена нет доступных команд",
      );
    }
    const slug = encodeURIComponent(account.slug);

    // Метрики независимы: падение одной не должно ломать остальные.
    const [builds, bandwidth, sites] = await Promise.allSettled([
      requestJson<NetlifyBuildStatus | NetlifyBuildStatus[]>(fetch, "Netlify", `${API}/${slug}/builds/status`, { headers }),
      requestJson<NetlifyBandwidth>(fetch, "Netlify", `${API}/accounts/${slug}/bandwidth`, { headers }),
      requestJson<NetlifySite[]>(fetch, "Netlify", `${API}/${slug}/sites?per_page=100`, { headers }),
    ]);

    const metrics: UsageMetric[] = [];
    let periodStart: string | null = null;
    let periodEnd: string | null = null;
    let bandwidthBytes: number | null = null;

    if (builds.status === "fulfilled") {
      const status = Array.isArray(builds.value) ? builds.value[0] : builds.value;
      const minutes = status?.minutes;
      if (minutes) {
        const included = toNumber(minutes.included_minutes_with_packs) || toNumber(minutes.included_minutes);
        metrics.push({
          key: "build_minutes",
          label: "Минуты сборки",
          used: toNumber(minutes.current),
          limit: included || null,
          unit: "minutes",
          resetsAt: minutes.period_end_date ?? null,
          note: included ? null : "Отдельной квоты нет — расход идёт из кредитов",
        });
        periodStart = minutes.period_start_date ?? null;
        periodEnd = minutes.period_end_date ?? null;
      }
    }

    if (bandwidth.status === "fulfilled" && bandwidth.value.used !== undefined) {
      bandwidthBytes = toNumber(bandwidth.value.used);
      const included = toNumber(bandwidth.value.included);
      metrics.push({
        key: "bandwidth",
        label: "Трафик",
        used: bandwidthBytes,
        limit: included || null,
        unit: "bytes",
        resetsAt: bandwidth.value.period_end_date ?? null,
        note: included ? null : "Отдельной квоты нет — расход идёт из кредитов",
      });
      periodStart ??= bandwidth.value.period_start_date ?? null;
      periodEnd ??= bandwidth.value.period_end_date ?? null;
    }

    // Кредиты: публичного API нет (github.com/netlify/open-api/issues/646),
    // поэтому считаем нижнюю границу по тому, что API отдаёт: деплои и трафик.
    const planCredits = PLAN_CREDITS[(account.type_name ?? "").trim().toLowerCase()];
    if (planCredits && sites.status === "fulfilled" && bandwidthBytes !== null) {
      const since = periodStart ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const deploys = await countProductionDeploys(fetch, headers, sites.value, since);
      if (deploys !== null) {
        const credits = Math.round(deploys * CREDITS_PER_DEPLOY + (bandwidthBytes / GB) * CREDITS_PER_GB);
        metrics.unshift({
          key: "credits_estimate",
          label: "Кредиты (оценка)",
          used: credits,
          limit: planCredits,
          unit: "credits",
          resetsAt: periodEnd,
          note: `Нижняя граница: ${deploys} деплоев × ${CREDITS_PER_DEPLOY} + трафик × ${CREDITS_PER_GB}/ГБ, без функций и запросов. Точный расход — в Netlify → Usage & billing.`,
        });
      }
    }

    if (sites.status === "fulfilled") {
      const included = toNumber(account.capabilities?.sites?.included);
      metrics.push({ key: "sites", label: "Сайты", used: sites.value.length, limit: included || null, unit: "count" });
    }

    const members = account.capabilities?.collaborators;
    if (members?.used !== undefined) {
      metrics.push({
        key: "collaborators",
        label: "Участники команды",
        used: toNumber(members.used),
        limit: toNumber(members.included) || null,
        unit: "count",
        // Занятые места тарифа — не расходуемый ресурс, тревожиться тут не о чем.
        alerting: false,
      });
    }

    if (metrics.length === 0) {
      throw new ProviderError("Netlify: API не вернул данных об использовании");
    }

    return { plan: account.type_name ?? null, periodStart, periodEnd, metrics };
  },
};

/** Число успешных production-деплоев всех сайтов команды с начала периода; null — если посчитать не удалось. */
async function countProductionDeploys(
  fetchImpl: typeof fetch,
  headers: Record<string, string>,
  sites: NetlifySite[],
  since: string,
): Promise<number | null> {
  const results = await Promise.allSettled(
    sites.slice(0, MAX_SITES_FOR_DEPLOYS).map((site) =>
      requestJson<NetlifyDeploy[]>(fetchImpl, "Netlify", `${API}/sites/${site.id}/deploys?production=true&per_page=100`, {
        headers,
      }),
    ),
  );
  if (results.every((r) => r.status === "rejected")) return null;
  // Даты сравниваем как числа: Netlify отдаёт начало периода со смещением (…-08:00).
  const sinceMs = Date.parse(since);
  let count = 0;
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    count += result.value.filter((d) => d.state === "ready" && Date.parse(d.created_at) >= sinceMs).length;
  }
  return count;
}
