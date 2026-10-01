import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

interface SubscriptionRow {
  id: string;
  name: string;
  category: string | null;
  cost: string | number;
  currency: string;
  billing_cycle: Subscription["billingCycle"];
  next_billing_date: string;
  status: Subscription["status"];
  remind_days_before: number;
  url: string | null;
  notes: string | null;
  integration_id: string | null;
  service_key: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

interface IntegrationRow {
  id: string;
  provider: IntegrationRecord["provider"];
  name: string;
  config: Record<string, string> | null;
  credentials_encrypted: string | null;
  status: IntegrationRecord["status"];
  last_synced_at: string | null;
  last_error: string | null;
  usage: UsageSnapshot | null;
  created_at: string;
}

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    cost: Number(row.cost),
    currency: row.currency.trim(),
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_billing_date,
    status: row.status,
    remindDaysBefore: row.remind_days_before,
    url: row.url,
    notes: row.notes,
    integrationId: row.integration_id,
    serviceKey: row.service_key ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromSubscriptionInput(input: Partial<SubscriptionInput>): Partial<SubscriptionRow> {
  const row: Partial<SubscriptionRow> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.category !== undefined) row.category = input.category;
  if (input.cost !== undefined) row.cost = input.cost;
  if (input.currency !== undefined) row.currency = input.currency;
  if (input.billingCycle !== undefined) row.billing_cycle = input.billingCycle;
  if (input.nextBillingDate !== undefined) row.next_billing_date = input.nextBillingDate;
  if (input.status !== undefined) row.status = input.status;
  if (input.remindDaysBefore !== undefined) row.remind_days_before = input.remindDaysBefore;
  if (input.url !== undefined) row.url = input.url;
  if (input.notes !== undefined) row.notes = input.notes;
  if (input.integrationId !== undefined) row.integration_id = input.integrationId;
  if (input.serviceKey !== undefined) row.service_key = input.serviceKey;
  if (input.trialEndsAt !== undefined) row.trial_ends_at = input.trialEndsAt;
  return row;
}

function toIntegration(row: IntegrationRow): IntegrationRecord {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    config: row.config ?? {},
    credentialsEncrypted: row.credentials_encrypted,
    hasCredentials: Boolean(row.credentials_encrypted),
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error,
    usage: row.usage,
    createdAt: row.created_at,
  };
}

function fromIntegrationPatch(patch: IntegrationPatch): Partial<IntegrationRow> {
  const row: Partial<IntegrationRow> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.config !== undefined) row.config = patch.config;
  if (patch.credentialsEncrypted !== undefined) row.credentials_encrypted = patch.credentialsEncrypted;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.lastSyncedAt !== undefined) row.last_synced_at = patch.lastSyncedAt;
  if (patch.lastError !== undefined) row.last_error = patch.lastError;
  if (patch.usage !== undefined) row.usage = patch.usage;
  return row;
}

function check(result: { data: unknown; error: { message: string } | null }, context: string): unknown {
  if (result.error) throw new Error(`Supabase (${context}): ${result.error.message}`);
  return result.data;
}

export class SupabaseRepository implements Repository {
  readonly kind = "supabase" as const;
  private readonly db: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });
  }

  async listSubscriptions() {
    const rows = check(
      await this.db.from("subscriptions").select("*").order("next_billing_date", { ascending: true }),
      "listSubscriptions",
    );
    return (rows as SubscriptionRow[]).map(toSubscription);
  }

  async getSubscription(id: string) {
    const row = check(await this.db.from("subscriptions").select("*").eq("id", id).maybeSingle(), "getSubscription");
    return row ? toSubscription(row as SubscriptionRow) : null;
  }

  async createSubscription(input: SubscriptionInput) {
    const row = check(
      await this.db.from("subscriptions").insert(fromSubscriptionInput(input)).select("*").single(),
      "createSubscription",
    );
    return toSubscription(row as SubscriptionRow);
  }

  async updateSubscription(id: string, patch: Partial<SubscriptionInput>) {
    const row = check(
      await this.db.from("subscriptions").update(fromSubscriptionInput(patch)).eq("id", id).select("*").single(),
      "updateSubscription",
    );
    return toSubscription(row as SubscriptionRow);
  }

  async deleteSubscription(id: string) {
    check(await this.db.from("subscriptions").delete().eq("id", id), "deleteSubscription");
  }

  async listIntegrations() {
    const rows = check(
      await this.db.from("integrations").select("*").order("created_at", { ascending: true }),
      "listIntegrations",
    );
    return (rows as IntegrationRow[]).map(toIntegration);
  }

  async getIntegration(id: string) {
    const row = check(await this.db.from("integrations").select("*").eq("id", id).maybeSingle(), "getIntegration");
    return row ? toIntegration(row as IntegrationRow) : null;
  }

  async createIntegration(input: IntegrationCreate) {
    const row = check(
      await this.db
        .from("integrations")
        .insert({
          provider: input.provider,
          name: input.name,
          config: input.config,
          credentials_encrypted: input.credentialsEncrypted,
        })
        .select("*")
        .single(),
      "createIntegration",
    );
    return toIntegration(row as IntegrationRow);
  }

  async updateIntegration(id: string, patch: IntegrationPatch) {
    const row = check(
      await this.db.from("integrations").update(fromIntegrationPatch(patch)).eq("id", id).select("*").single(),
      "updateIntegration",
    );
    return toIntegration(row as IntegrationRow);
  }

  async deleteIntegration(id: string) {
    check(await this.db.from("integrations").delete().eq("id", id), "deleteIntegration");
  }

  async addUsageSnapshot(integrationId: string, snapshot: UsageSnapshot) {
    check(
      await this.db
        .from("usage_snapshots")
        .insert({ integration_id: integrationId, snapshot, fetched_at: snapshot.fetchedAt }),
      "addUsageSnapshot",
    );
  }

  async claimNotification(input: NotificationLogInput) {
    const result = await this.db.from("notification_log").insert({
      dedupe_key: input.dedupeKey,
      kind: input.kind,
      channel: input.channel,
      subscription_id: input.subscriptionId ?? null,
      integration_id: input.integrationId ?? null,
    });
    // 23505 — unique_violation: такое уведомление уже отправлялось.
    if (result.error?.code === "23505") return false;
    check(result, "claimNotification");
    return true;
  }

  async releaseNotification(dedupeKey: string) {
    check(await this.db.from("notification_log").delete().eq("dedupe_key", dedupeKey), "releaseNotification");
  }
}
