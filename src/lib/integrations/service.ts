import "server-only";
import { decryptJson, encryptJson } from "../crypto";
import { getRepository } from "../db";
import { env, isDemoMode } from "../env";
import type { IntegrationRecord, ProviderId, UsageSnapshot } from "../types";
import { getProvider } from ".";
import { ProviderError } from "./types";

const DEMO_KEY = "demo-mode-insecure-key";

export function getEncryptionKey(): string {
  if (env.encryptionKey) return env.encryptionKey;
  if (isDemoMode()) return DEMO_KEY;
  throw new Error("Не задан ENCRYPTION_KEY — без него нельзя безопасно сохранить API-ключи.");
}

/** Разделяет значения формы на секреты (шифруются) и несекретную конфигурацию. */
export function splitFields(providerId: ProviderId, values: Record<string, string>) {
  const provider = getProvider(providerId);
  if (!provider) throw new Error(`Неизвестный провайдер: ${providerId}`);
  const secrets: Record<string, string> = {};
  const config: Record<string, string> = {};
  for (const field of provider.fields) {
    const value = values[field.key]?.trim() ?? "";
    if (field.secret) {
      if (value) secrets[field.key] = value;
    } else if (value) {
      config[field.key] = value;
    }
  }
  return { provider, secrets, config };
}

export function encryptSecrets(secrets: Record<string, string>): string | null {
  return Object.keys(secrets).length > 0 ? encryptJson(secrets, getEncryptionKey()) : null;
}

function demoUsage(previous: UsageSnapshot | null): Omit<UsageSnapshot, "fetchedAt"> {
  // В демо-режиме имитируем небольшой рост потребления при каждой синхронизации.
  return {
    ...(previous ?? { metrics: [] }),
    metrics: (previous?.metrics ?? []).map((m) => {
      const step = (m.limit ?? m.used) * (0.005 + Math.random() * 0.02);
      const used = m.limit ? Math.min(m.used + step, m.limit) : m.used + step;
      return { ...m, used: m.unit === "count" ? Math.round(used) : Math.round(used * 100) / 100 };
    }),
  };
}

export async function syncIntegration(record: IntegrationRecord, now = new Date()): Promise<IntegrationRecord> {
  const repo = getRepository();
  const provider = getProvider(record.provider);
  const fetchedAt = now.toISOString();

  try {
    if (!provider) throw new ProviderError(`Провайдер ${record.provider} не поддерживается`);

    let usage: Omit<UsageSnapshot, "fetchedAt">;
    if (record.config.demo === "1") {
      usage = demoUsage(record.usage);
    } else {
      const secrets = record.credentialsEncrypted
        ? decryptJson<Record<string, string>>(record.credentialsEncrypted, getEncryptionKey())
        : {};
      const missing = provider.fields.filter((f) => f.secret && f.required && !secrets[f.key]);
      if (missing.length) throw new ProviderError(`Не заполнено: ${missing.map((f) => f.label).join(", ")}`);
      usage = await provider.fetchUsage({ secrets, config: record.config, fetch, now });
    }

    const snapshot: UsageSnapshot = { ...usage, fetchedAt };
    const updated = await repo.updateIntegration(record.id, {
      status: "ok",
      lastError: null,
      lastSyncedAt: fetchedAt,
      usage: snapshot,
    });
    await repo.addUsageSnapshot(record.id, snapshot).catch(() => undefined);
    return updated;
  } catch (error) {
    const message =
      error instanceof ProviderError
        ? error.message
        : error instanceof Error && /decrypt|auth/i.test(error.message)
          ? "Не удалось расшифровать ключ — проверьте ENCRYPTION_KEY или привяжите ключ заново"
          : error instanceof Error
            ? error.message
            : "Неизвестная ошибка";
    return repo.updateIntegration(record.id, { status: "error", lastError: message, lastSyncedAt: fetchedAt });
  }
}

export async function syncAllIntegrations(now = new Date()) {
  const integrations = await getRepository().listIntegrations();
  const results = await Promise.all(integrations.map((i) => syncIntegration(i, now)));
  return {
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    failed: results.filter((r) => r.status === "error").map((r) => ({ id: r.id, name: r.name, error: r.lastError })),
  };
}

/** Убирает зашифрованные данные перед передачей в UI. */
export function toPublicIntegration({ credentialsEncrypted: _omit, ...rest }: IntegrationRecord) {
  void _omit;
  return rest;
}
