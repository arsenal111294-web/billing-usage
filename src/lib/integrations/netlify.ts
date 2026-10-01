import { requestJson, toNumber } from "./http";
import { ProviderError, type ProviderDefinition } from "./types";
import type { UsageMetric } from "../types";

const API = "https://api.netlify.com/api/v1";

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

const CAPABILITY_LABELS: Record<string, string> = {
  sites: "Сайты",
  collaborators: "Участники команды",
};

export const netlifyProvider: ProviderDefinition = {
  id: "netlify",
  name: "Netlify",
  description: "Минуты сборки, трафик и лимиты команды (Personal Access Token).",
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

  async fetchUsage({ secrets, config, fetch }) {
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
    const [builds, bandwidth] = await Promise.allSettled([
      requestJson<NetlifyBuildStatus | NetlifyBuildStatus[]>(fetch, "Netlify", `${API}/${slug}/builds/status`, { headers }),
      requestJson<NetlifyBandwidth>(fetch, "Netlify", `${API}/accounts/${slug}/bandwidth`, { headers }),
    ]);

    const metrics: UsageMetric[] = [];
    let periodStart: string | null = null;
    let periodEnd: string | null = null;

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
        });
        periodStart = minutes.period_start_date ?? null;
        periodEnd = minutes.period_end_date ?? null;
      }
    }

    if (bandwidth.status === "fulfilled" && bandwidth.value.used !== undefined) {
      metrics.push({
        key: "bandwidth",
        label: "Трафик",
        used: toNumber(bandwidth.value.used),
        limit: toNumber(bandwidth.value.included) || null,
        unit: "bytes",
        resetsAt: bandwidth.value.period_end_date ?? null,
      });
      periodStart ??= bandwidth.value.period_start_date ?? null;
      periodEnd ??= bandwidth.value.period_end_date ?? null;
    }

    for (const [key, cap] of Object.entries(account.capabilities ?? {})) {
      if (!CAPABILITY_LABELS[key] || cap?.used === undefined) continue;
      metrics.push({
        key,
        label: CAPABILITY_LABELS[key],
        used: toNumber(cap.used),
        limit: toNumber(cap.included) || null,
        unit: "count",
      });
    }

    if (metrics.length === 0) {
      throw new ProviderError("Netlify: API не вернул данных об использовании");
    }

    return { plan: account.type_name ?? null, periodStart, periodEnd, metrics };
  },
};
