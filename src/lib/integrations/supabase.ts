import { requestJson, toNumber } from "./http";
import { ProviderError, type ProviderDefinition } from "./types";
import type { MetricUnit, UsageMetric } from "../types";

const API = "https://api.supabase.com";
const GB = 1024 ** 3;
/** Supabase считает размер БД в десятичных гигабайтах. */
const DECIMAL_GB = 1e9;

/** Квоты тарифов Supabase (https://supabase.com/pricing) — для запасного режима без отчёта об использовании. */
const PLAN_QUOTAS: Record<string, { dbGb: number; storageBytes: number; mau: number; activeProjects: number | null }> = {
  free: { dbGb: 0.5, storageBytes: 1 * GB, mau: 50_000, activeProjects: 2 },
  pro: { dbGb: 8, storageBytes: 100 * GB, mau: 100_000, activeProjects: null },
  team: { dbGb: 8, storageBytes: 100 * GB, mau: 100_000, activeProjects: null },
};

interface SupabaseOrganization {
  id: string;
  name: string;
  plan?: string;
}

interface SupabaseProject {
  id: string; // project ref
  name: string;
  organization_id: string;
  status: string;
}

/** Ответ /platform/organizations/{slug}/usage — тот же отчёт, что на странице Usage в дашборде. */
interface OrgUsageResponse {
  usages?: {
    metric: string;
    usage?: number;
    pricing_free_units?: number | null;
    unlimited?: boolean;
    available_in_plan?: boolean;
  }[];
}

interface ProjectStats {
  db_bytes: number | string;
  storage_bytes: number | string;
  mau: number | string;
  third_party_mau: number | string;
}

/** Показатели отчёта в порядке, как на странице Usage дашборда Supabase. */
const USAGE_METRICS: Record<string, { label: string; unit: MetricUnit; alerting?: boolean }> = {
  EGRESS: { label: "Egress", unit: "gb" },
  CACHED_EGRESS: { label: "Cached Egress", unit: "gb" },
  DATABASE_SIZE: { label: "Размер БД", unit: "gb" },
  STORAGE_SIZE: { label: "Хранилище файлов", unit: "gb" },
  MONTHLY_ACTIVE_USERS: { label: "Monthly Active Users", unit: "count" },
  MONTHLY_ACTIVE_THIRD_PARTY_USERS: { label: "Monthly Active Third-Party Users", unit: "count" },
  MONTHLY_ACTIVE_SSO_USERS: { label: "Monthly Active SSO Users", unit: "count" },
  REALTIME_PEAK_CONNECTIONS: { label: "Realtime: пиковые подключения", unit: "count" },
  REALTIME_MESSAGE_COUNT: { label: "Realtime: сообщения", unit: "count" },
  FUNCTION_INVOCATIONS: { label: "Вызовы Edge Functions", unit: "count" },
  STORAGE_IMAGES_TRANSFORMED: { label: "Трансформации изображений", unit: "count" },
  // Пока не тарифицируются (в дашборде помечены как UPCOMING) — показываем без тревог.
  LOG_INGESTION: { label: "Log Ingestion", unit: "gb", alerting: false },
  LOG_QUERYING: { label: "Log Query", unit: "gb", alerting: false },
};

// Только чтение: размер БД, объём файлов и активные пользователи с начала месяца.
// Размер БД — сумма всех баз на сервере проекта (включая template0/1): так считает дашборд Supabase.
const STATS_QUERY = `
select
  (select sum(pg_database_size(oid)) from pg_database) as db_bytes,
  (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects) as storage_bytes,
  (select count(*) from auth.users where last_sign_in_at >= date_trunc('month', now())) as mau,
  (select count(distinct i.user_id) from auth.identities i join auth.users u on u.id = i.user_id
     where u.last_sign_in_at >= date_trunc('month', now()) and i.provider not in ('email', 'phone')) as third_party_mau
`;

export const supabaseProvider: ProviderDefinition = {
  id: "supabase",
  name: "Supabase",
  description: "Egress, размер БД и хранилища, MAU, Realtime и Edge Functions относительно квот тарифа.",
  docsUrl: "https://supabase.com/dashboard/account/tokens",
  fields: [
    { key: "token", label: "Personal Access Token", type: "password", secret: true, required: true, placeholder: "sbp_…" },
    {
      key: "organization",
      label: "ID (slug) организации",
      type: "text",
      secret: false,
      required: false,
      help: "Если не указан — первая организация аккаунта.",
    },
    {
      key: "projectRef",
      label: "Ref проекта",
      type: "text",
      secret: false,
      required: false,
      placeholder: "abcdefghijklmnop",
      help: "Если указан — показывается использование только этого проекта.",
    },
  ],

  async fetchUsage({ secrets, config, fetch }) {
    const headers = { Authorization: `Bearer ${secrets.token}` };
    const orgs = await requestJson<SupabaseOrganization[]>(fetch, "Supabase", `${API}/v1/organizations`, { headers });
    const orgRef = config.organization ? orgs.find((o) => o.id === config.organization) : orgs[0];
    if (!orgRef) throw new ProviderError("Supabase: организация не найдена");
    const slug = encodeURIComponent(orgRef.id);
    let reportError = "";

    const [org, projects, usage] = await Promise.all([
      requestJson<SupabaseOrganization>(fetch, "Supabase", `${API}/v1/organizations/${slug}`, { headers }).catch(() => orgRef),
      requestJson<SupabaseProject[]>(fetch, "Supabase", `${API}/v1/projects`, { headers }),
      // Внутренний эндпоинт дашборда: недокументирован, поэтому при отказе работаем без него.
      requestJson<OrgUsageResponse>(
        fetch,
        "Supabase",
        `${API}/platform/organizations/${slug}/usage${config.projectRef ? `?project_ref=${encodeURIComponent(config.projectRef)}` : ""}`,
        { headers },
      ).catch((error: unknown) => {
        reportError = error instanceof ProviderError && error.status ? `HTTP ${error.status}` : "нет ответа";
        return null;
      }),
    ]);

    const plan = (org.plan ?? "free").toLowerCase();
    const quota = PLAN_QUOTAS[plan] ?? null;
    const orgProjects = projects.filter((p) => p.organization_id === orgRef.id);
    const active = orgProjects.filter((p) => p.status.startsWith("ACTIVE"));
    const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

    if (config.projectRef && !orgProjects.some((p) => p.id === config.projectRef)) {
      throw new ProviderError(`Supabase: проект ${config.projectRef} не найден в организации`);
    }

    const projectsMetric: UsageMetric = {
      key: "active_projects",
      label: "Активные проекты",
      used: active.length,
      limit: quota?.activeProjects ?? null,
      unit: "count",
      // Занятые слоты тарифа, а не расходуемый ресурс — без тревог и уведомлений.
      alerting: false,
    };

    const reportMetrics = usage?.usages ? fromUsageReport(usage) : [];
    if (reportMetrics.length > 0) {
      return { plan: planLabel, metrics: [...reportMetrics, projectsMetric] };
    }

    return {
      plan: planLabel,
      metrics: [projectsMetric, ...(await sqlFallback(fetch, headers, orgProjects, active, config.projectRef, quota))],
      notes: [
        `Supabase не отдаёт отчёт об использовании по токену (${reportError || "пустой ответ"}): Egress, Realtime и Edge Functions доступны только в дашборде. Остальное посчитано по проектам.`,
      ],
    };
  },
};

function fromUsageReport(report: OrgUsageResponse): UsageMetric[] {
  const byMetric = new Map((report.usages ?? []).map((u) => [u.metric, u]));
  const metrics: UsageMetric[] = [];
  for (const [metric, meta] of Object.entries(USAGE_METRICS)) {
    const item = byMetric.get(metric);
    if (!item) continue;
    const available = item.available_in_plan !== false;
    metrics.push({
      key: metric.toLowerCase(),
      label: meta.label,
      used: toNumber(item.usage),
      limit: available && !item.unlimited && item.pricing_free_units ? toNumber(item.pricing_free_units) : null,
      unit: meta.unit,
      alerting: meta.alerting,
      note: available ? null : "Недоступно на текущем тарифе",
    });
  }
  return metrics;
}

/** Запасной режим: только публичный API и SELECT-запросы к проектам. */
async function sqlFallback(
  fetchImpl: typeof fetch,
  headers: Record<string, string>,
  orgProjects: SupabaseProject[],
  active: SupabaseProject[],
  projectRef: string | undefined,
  quota: (typeof PLAN_QUOTAS)[string] | null,
): Promise<UsageMetric[]> {
  const targets = projectRef ? orgProjects.filter((p) => p.id === projectRef) : active.slice(0, 5);
  const stats = await Promise.allSettled(
    targets.map((project) =>
      requestJson<ProjectStats[]>(fetchImpl, "Supabase", `${API}/v1/projects/${project.id}/database/query`, {
        method: "POST",
        headers,
        body: { query: STATS_QUERY },
      }),
    ),
  );

  const metrics: UsageMetric[] = [];
  let storageTotal = 0;
  let mauTotal = 0;
  let thirdPartyTotal = 0;
  let statsAvailable = false;
  stats.forEach((result, i) => {
    const project = targets[i];
    if (result.status !== "fulfilled" || !result.value[0]) {
      metrics.push({
        key: `db_size:${project.id}`,
        label: `БД «${project.name}»`,
        used: 0,
        limit: null,
        unit: "gb",
        note: "Не удалось выполнить запрос статистики",
      });
      return;
    }
    statsAvailable = true;
    const row = result.value[0];
    storageTotal += toNumber(row.storage_bytes);
    mauTotal += toNumber(row.mau);
    thirdPartyTotal += toNumber(row.third_party_mau);
    metrics.push({
      key: `db_size:${project.id}`,
      label: `БД «${project.name}»`,
      used: Math.round((toNumber(row.db_bytes) / DECIMAL_GB) * 1000) / 1000,
      limit: quota?.dbGb ?? null,
      unit: "gb",
    });
  });

  if (statsAvailable) {
    metrics.push(
      { key: "storage_size", label: "Хранилище файлов", used: storageTotal, limit: quota?.storageBytes ?? null, unit: "bytes" },
      { key: "mau", label: "Monthly Active Users", used: mauTotal, limit: quota?.mau ?? null, unit: "count" },
      {
        key: "third_party_mau",
        label: "Monthly Active Third-Party Users",
        used: thirdPartyTotal,
        limit: quota?.mau ?? null,
        unit: "count",
      },
    );
  }
  return metrics;
}
