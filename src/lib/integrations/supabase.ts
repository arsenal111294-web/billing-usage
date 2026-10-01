import { requestJson, toNumber } from "./http";
import { ProviderError, type ProviderDefinition } from "./types";
import type { UsageMetric } from "../types";

const API = "https://api.supabase.com/v1";
const MB = 1024 ** 2;
const GB = 1024 ** 3;

/** Квоты тарифов Supabase (https://supabase.com/pricing). Для pro/team — включённый объём до оверейджа. */
const PLAN_QUOTAS: Record<string, { dbBytes: number; storageBytes: number; mau: number; activeProjects: number | null }> = {
  free: { dbBytes: 500 * MB, storageBytes: 1 * GB, mau: 50_000, activeProjects: 2 },
  pro: { dbBytes: 8 * GB, storageBytes: 100 * GB, mau: 100_000, activeProjects: null },
  team: { dbBytes: 8 * GB, storageBytes: 100 * GB, mau: 100_000, activeProjects: null },
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

interface ProjectStats {
  db_bytes: number | string;
  storage_bytes: number | string;
  mau: number | string;
}

const STATS_QUERY = `
select
  pg_database_size(current_database()) as db_bytes,
  (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects) as storage_bytes,
  (select count(*) from auth.users where last_sign_in_at >= date_trunc('month', now())) as mau
`;

export const supabaseProvider: ProviderDefinition = {
  id: "supabase",
  name: "Supabase",
  description: "Размер БД, хранилища, MAU и число проектов относительно квот тарифа (Management API).",
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
      help: "Если не указан — собираются метрики всех активных проектов организации (до 5).",
    },
  ],

  async fetchUsage({ secrets, config, fetch }) {
    const headers = { Authorization: `Bearer ${secrets.token}` };
    const orgs = await requestJson<SupabaseOrganization[]>(fetch, "Supabase", `${API}/organizations`, { headers });
    const orgRef = config.organization ? orgs.find((o) => o.id === config.organization) : orgs[0];
    if (!orgRef) throw new ProviderError("Supabase: организация не найдена");

    const [org, projects] = await Promise.all([
      requestJson<SupabaseOrganization>(fetch, "Supabase", `${API}/organizations/${encodeURIComponent(orgRef.id)}`, {
        headers,
      }).catch(() => orgRef),
      requestJson<SupabaseProject[]>(fetch, "Supabase", `${API}/projects`, { headers }),
    ]);

    const plan = (org.plan ?? "free").toLowerCase();
    const quota = PLAN_QUOTAS[plan] ?? null;
    const orgProjects = projects.filter((p) => p.organization_id === orgRef.id);
    const active = orgProjects.filter((p) => p.status.startsWith("ACTIVE"));

    const metrics: UsageMetric[] = [
      {
        key: "active_projects",
        label: "Активные проекты",
        used: active.length,
        limit: quota?.activeProjects ?? null,
        unit: "count",
      },
    ];

    const targets = config.projectRef ? orgProjects.filter((p) => p.id === config.projectRef) : active.slice(0, 5);
    if (config.projectRef && targets.length === 0) {
      throw new ProviderError(`Supabase: проект ${config.projectRef} не найден в организации`);
    }

    const stats = await Promise.allSettled(
      targets.map((project) =>
        requestJson<ProjectStats[]>(fetch, "Supabase", `${API}/projects/${project.id}/database/query`, {
          method: "POST",
          headers,
          body: { query: STATS_QUERY },
        }),
      ),
    );

    let storageTotal = 0;
    let mauTotal = 0;
    let statsAvailable = false;
    stats.forEach((result, i) => {
      const project = targets[i];
      if (result.status !== "fulfilled" || !result.value[0]) {
        metrics.push({
          key: `db_size:${project.id}`,
          label: `БД «${project.name}»`,
          used: 0,
          limit: null,
          unit: "bytes",
          note: "Не удалось выполнить запрос статистики",
        });
        return;
      }
      statsAvailable = true;
      const row = result.value[0];
      storageTotal += toNumber(row.storage_bytes);
      mauTotal += toNumber(row.mau);
      metrics.push({
        key: `db_size:${project.id}`,
        label: `БД «${project.name}»`,
        used: toNumber(row.db_bytes),
        limit: quota?.dbBytes ?? null,
        unit: "bytes",
      });
    });

    if (statsAvailable) {
      metrics.push(
        { key: "storage_size", label: "Хранилище файлов", used: storageTotal, limit: quota?.storageBytes ?? null, unit: "bytes" },
        { key: "mau", label: "Активные пользователи (MAU)", used: mauTotal, limit: quota?.mau ?? null, unit: "count" },
      );
    }

    return { plan: plan.charAt(0).toUpperCase() + plan.slice(1), metrics };
  },
};
