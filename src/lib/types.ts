export const BILLING_CYCLES = ["monthly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const SUBSCRIPTION_STATUSES = ["active", "paused"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PROVIDER_IDS = ["netlify", "supabase", "anthropic", "openai", "manual"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export type IntegrationStatus = "pending" | "ok" | "error";

/** Дата без времени в формате YYYY-MM-DD. */
export type ISODate = string;

export interface Subscription {
  id: string;
  name: string;
  category: string | null;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: ISODate;
  status: SubscriptionStatus;
  remindDaysBefore: number;
  url: string | null;
  notes: string | null;
  integrationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionInput = Omit<Subscription, "id" | "createdAt" | "updatedAt">;

export type MetricUnit = "usd" | "tokens" | "minutes" | "bytes" | "requests" | "count" | "credits" | "gb";

export interface UsageMetric {
  key: string;
  label: string;
  used: number;
  /** null — лимит неизвестен/не ограничен. */
  limit: number | null;
  unit: MetricUnit;
  resetsAt?: string | null;
  note?: string | null;
  /** false — справочная метрика (например, занятые места тарифа): без алертов и уведомлений. */
  alerting?: boolean;
}

export interface UsageSnapshot {
  fetchedAt: string;
  plan?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  metrics: UsageMetric[];
  /** Пояснения к снимку (например, что часть данных недоступна). */
  notes?: string[];
}

export interface Integration {
  id: string;
  provider: ProviderId;
  name: string;
  config: Record<string, string>;
  status: IntegrationStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  usage: UsageSnapshot | null;
  hasCredentials: boolean;
  createdAt: string;
}

/** Внутреннее представление — никогда не передаётся в клиентские компоненты. */
export interface IntegrationRecord extends Integration {
  credentialsEncrypted: string | null;
}

export interface IntegrationCreate {
  provider: ProviderId;
  name: string;
  config: Record<string, string>;
  credentialsEncrypted: string | null;
}

export type IntegrationPatch = Partial<
  Pick<IntegrationRecord, "name" | "config" | "credentialsEncrypted" | "status" | "lastSyncedAt" | "lastError" | "usage">
>;

export type NotificationChannel = "email" | "telegram";
export type NotificationKind = "charge" | "limit" | "test";

export interface NotificationLogInput {
  dedupeKey: string;
  kind: NotificationKind;
  channel: NotificationChannel;
  subscriptionId?: string | null;
  integrationId?: string | null;
}
