import { randomUUID } from "node:crypto";
import { addDays, todayISO } from "../dates";
import type {
  IntegrationCreate,
  IntegrationPatch,
  IntegrationRecord,
  NotificationLogInput,
  Subscription,
  SubscriptionInput,
  UsageSnapshot,
} from "../types";
import type { Repository } from "./repository";

/**
 * Хранилище в памяти процесса для демо-режима (когда Supabase не настроен).
 * В serverless-окружении данные живут, пока жив инстанс функции.
 */
interface MemoryState {
  subscriptions: Subscription[];
  integrations: IntegrationRecord[];
  notifications: Set<string>;
}

function now() {
  return new Date().toISOString();
}

function seedState(): MemoryState {
  const today = todayISO();
  const ts = now();
  const sub = (
    input: Omit<SubscriptionInput, "notes" | "integrationId" | "url" | "serviceKey" | "trialEndsAt"> & Partial<SubscriptionInput>,
  ): Subscription => ({
    id: randomUUID(),
    notes: null,
    url: null,
    integrationId: null,
    serviceKey: null,
    trialEndsAt: null,
    createdAt: ts,
    updatedAt: ts,
    ...input,
  });

  const integrations: IntegrationRecord[] = [
    demoIntegration("netlify", "Netlify — личная команда", {
      plan: "Pro",
      metrics: [
        { key: "build_minutes", label: "Минуты сборки", used: 212, limit: 1000, unit: "minutes" },
        { key: "bandwidth", label: "Трафик", used: 41.3 * 1024 ** 3, limit: 1024 ** 4, unit: "bytes" },
        { key: "sites", label: "Сайты", used: 7, limit: 500, unit: "count" },
      ],
    }),
    demoIntegration("supabase", "Supabase — организация", {
      plan: "Free",
      metrics: [
        { key: "db_size", label: "Размер БД", used: 412 * 1024 ** 2, limit: 500 * 1024 ** 2, unit: "bytes" },
        { key: "storage_size", label: "Хранилище файлов", used: 0.31 * 1024 ** 3, limit: 1024 ** 3, unit: "bytes" },
        { key: "active_projects", label: "Активные проекты", used: 2, limit: 2, unit: "count", alerting: false },
      ],
    }),
    demoIntegration("anthropic", "Anthropic API", {
      plan: "Бюджет $50/мес",
      metrics: [
        { key: "cost_month", label: "Расходы за месяц", used: 37.84, limit: 50, unit: "usd" },
        { key: "input_tokens", label: "Входные токены", used: 8_420_000, limit: null, unit: "tokens" },
        { key: "output_tokens", label: "Выходные токены", used: 1_130_000, limit: null, unit: "tokens" },
      ],
    }),
  ];

  const subscriptions: Subscription[] = [
    sub({ name: "Claude Max", serviceKey: "claude", category: "AI", cost: 100, currency: "USD", billingCycle: "monthly", nextBillingDate: addDays(today, 2), status: "active", remindDaysBefore: 3, url: "https://claude.ai/settings/billing" }),
    sub({ name: "Netlify Pro", serviceKey: "netlify", category: "Хостинг", cost: 19, currency: "USD", billingCycle: "monthly", nextBillingDate: addDays(today, 11), status: "active", remindDaysBefore: 3, url: "https://app.netlify.com", integrationId: integrations[0].id }),
    sub({ name: "Supabase Pro", serviceKey: "supabase", category: "Хостинг", cost: 25, currency: "USD", billingCycle: "monthly", nextBillingDate: addDays(today, 19), status: "active", remindDaysBefore: 3, url: "https://supabase.com/dashboard", integrationId: integrations[1].id }),
    sub({ name: "GitHub Copilot", serviceKey: "github-copilot", category: "Разработка", cost: 100, currency: "USD", billingCycle: "yearly", nextBillingDate: addDays(today, 140), status: "active", remindDaysBefore: 3, url: "https://github.com/settings/billing" }),
    sub({ name: "JetBrains All Products", serviceKey: "jetbrains", category: "Разработка", cost: 289, currency: "EUR", billingCycle: "yearly", nextBillingDate: addDays(today, 64), status: "active", remindDaysBefore: 7 }),
    sub({ name: "Домен example.ru", category: "Домены", cost: 990, currency: "RUB", billingCycle: "yearly", nextBillingDate: addDays(today, 1), status: "active", remindDaysBefore: 3 }),
    sub({ name: "Figma Professional", serviceKey: "figma", category: "Дизайн", cost: 15, currency: "USD", billingCycle: "monthly", nextBillingDate: addDays(today, 6), status: "paused", remindDaysBefore: 3, url: "https://figma.com" }),
    sub({ name: "Яндекс Плюс", serviceKey: "yandex-plus", category: "Экосистемы", cost: 449, currency: "RUB", billingCycle: "monthly", nextBillingDate: addDays(today, 9), status: "active", remindDaysBefore: 3, url: "https://plus.yandex.ru/my" }),
    sub({ name: "Кинопоиск", serviceKey: "kinopoisk", category: "Кино и ТВ", cost: 449, currency: "RUB", billingCycle: "monthly", nextBillingDate: addDays(today, 15), status: "active", remindDaysBefore: 3, url: "https://hd.kinopoisk.ru/" }),
    sub({ name: "Okko", serviceKey: "okko", category: "Кино и ТВ", cost: 399, currency: "RUB", billingCycle: "monthly", nextBillingDate: addDays(today, 2), trialEndsAt: addDays(today, 2), status: "active", remindDaysBefore: 3, url: "https://okko.tv/" }),
  ];

  return { subscriptions, integrations, notifications: new Set() };
}

function demoIntegration(
  provider: IntegrationRecord["provider"],
  name: string,
  usage: Omit<UsageSnapshot, "fetchedAt">,
): IntegrationRecord {
  const ts = now();
  return {
    id: randomUUID(),
    provider,
    name,
    config: { demo: "1" },
    credentialsEncrypted: null,
    hasCredentials: false,
    status: "ok",
    lastSyncedAt: ts,
    lastError: null,
    usage: { fetchedAt: ts, ...usage },
    createdAt: ts,
  };
}

const globalStore = globalThis as unknown as { __billingUsageMemory?: MemoryState };

function state(): MemoryState {
  globalStore.__billingUsageMemory ??= seedState();
  return globalStore.__billingUsageMemory;
}

function notFound(entity: string, id: string): never {
  throw new Error(`${entity} ${id} не найдена`);
}

export class MemoryRepository implements Repository {
  readonly kind = "memory" as const;

  async listSubscriptions() {
    return [...state().subscriptions].sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));
  }

  async getSubscription(id: string) {
    return state().subscriptions.find((s) => s.id === id) ?? null;
  }

  async createSubscription(input: SubscriptionInput) {
    const ts = now();
    const sub: Subscription = { ...input, id: randomUUID(), createdAt: ts, updatedAt: ts };
    state().subscriptions.push(sub);
    return sub;
  }

  async updateSubscription(id: string, patch: Partial<SubscriptionInput>) {
    const sub = state().subscriptions.find((s) => s.id === id) ?? notFound("Подписка", id);
    Object.assign(sub, patch, { updatedAt: now() });
    return sub;
  }

  async deleteSubscription(id: string) {
    state().subscriptions = state().subscriptions.filter((s) => s.id !== id);
  }

  async listIntegrations() {
    return [...state().integrations];
  }

  async getIntegration(id: string) {
    return state().integrations.find((i) => i.id === id) ?? null;
  }

  async createIntegration(input: IntegrationCreate) {
    const record: IntegrationRecord = {
      ...input,
      id: randomUUID(),
      hasCredentials: Boolean(input.credentialsEncrypted),
      status: "pending",
      lastSyncedAt: null,
      lastError: null,
      usage: null,
      createdAt: now(),
    };
    state().integrations.push(record);
    return record;
  }

  async updateIntegration(id: string, patch: IntegrationPatch) {
    const record = state().integrations.find((i) => i.id === id) ?? notFound("Интеграция", id);
    Object.assign(record, patch);
    record.hasCredentials = Boolean(record.credentialsEncrypted);
    return record;
  }

  async deleteIntegration(id: string) {
    const s = state();
    s.integrations = s.integrations.filter((i) => i.id !== id);
    for (const sub of s.subscriptions) if (sub.integrationId === id) sub.integrationId = null;
  }

  async addUsageSnapshot() {
    // История в демо-режиме не хранится.
  }

  async claimNotification(input: NotificationLogInput) {
    const set = state().notifications;
    if (set.has(input.dedupeKey)) return false;
    set.add(input.dedupeKey);
    return true;
  }

  async releaseNotification(dedupeKey: string) {
    state().notifications.delete(dedupeKey);
  }
}

/** Только для тестов. */
export function resetMemoryStore() {
  delete globalStore.__billingUsageMemory;
}
