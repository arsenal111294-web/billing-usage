"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { decryptJson } from "@/lib/crypto";
import { getRepository } from "@/lib/db";
import { getProvider } from "@/lib/integrations";
import { detectKey } from "@/lib/integrations/detect";
import { isStale } from "@/lib/integrations/stale";
import { encryptSecrets, getEncryptionKey, splitFields, syncAllIntegrations, syncIntegration } from "@/lib/integrations/service";
import { PROVIDER_IDS, type ProviderId } from "@/lib/types";

export interface IntegrationFormState {
  ok?: boolean;
  message?: string;
  /** Сохранено, но с проблемой (например, синхронизация не удалась). */
  warning?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function saveIntegrationAction(_prev: IntegrationFormState, formData: FormData): Promise<IntegrationFormState> {
  await requireAuth();
  const repo = getRepository();
  const id = String(formData.get("id") ?? "") || null;
  const existing = id ? await repo.getIntegration(id) : null;
  if (id && !existing) return { error: "Интеграция не найдена" };

  const providerId = (existing?.provider ?? String(formData.get("provider") ?? "")) as ProviderId;
  const provider = getProvider(providerId);
  if (!provider || !PROVIDER_IDS.includes(providerId)) return { error: "Выберите сервис" };

  const name = String(formData.get("name") ?? "").trim() || provider.name;
  if (name.length > 100) return { fieldErrors: { name: "Не длиннее 100 символов" } };

  const values: Record<string, string> = {};
  for (const field of provider.fields) values[field.key] = String(formData.get(`field_${field.key}`) ?? "").trim();

  try {
    const { secrets, config } = splitFields(providerId, values);

    // При редактировании пустое секретное поле означает «оставить текущий ключ».
    let mergedSecrets = secrets;
    if (existing?.credentialsEncrypted) {
      const current = decryptJson<Record<string, string>>(existing.credentialsEncrypted, getEncryptionKey());
      mergedSecrets = { ...current, ...secrets };
    }

    const fieldErrors: Record<string, string> = {};
    for (const field of provider.fields) {
      const present = field.secret ? Boolean(mergedSecrets[field.key]) : Boolean(config[field.key]);
      if (field.required && !present) fieldErrors[field.key] = "Обязательное поле";
      if (field.type === "number" && config[field.key] && !Number.isFinite(Number(config[field.key].replace(",", ".")))) {
        fieldErrors[field.key] = "Введите число";
      }
    }
    if (Object.keys(fieldErrors).length) return { fieldErrors };

    const credentialsEncrypted = encryptSecrets(mergedSecrets);
    const record = existing
      ? await repo.updateIntegration(existing.id, { name, config, credentialsEncrypted, status: "pending", lastError: null })
      : await repo.createIntegration({ provider: providerId, name, config, credentialsEncrypted });

    const synced = await syncIntegration(record);
    refresh();
    return synced.status === "ok"
      ? { ok: true, message: `«${name}» сохранено и синхронизировано` }
      : { ok: true, message: `«${name}» сохранено, но синхронизация не удалась: ${synced.lastError}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось сохранить интеграцию" };
  }
}

/** Быстрое подключение: один ключ, сервис определяется по префиксу. */
export async function quickConnectAction(_prev: IntegrationFormState, formData: FormData): Promise<IntegrationFormState> {
  await requireAuth();
  const key = String(formData.get("key") ?? "").trim();
  const detected = detectKey(key);
  if ("error" in detected) return { error: detected.error };

  const provider = getProvider(detected.provider)!;
  const repo = getRepository();
  try {
    // Тот же ключ уже подключён — просто обновляем данные, без дубликата.
    for (const existing of await repo.listIntegrations()) {
      if (existing.provider !== detected.provider || !existing.credentialsEncrypted) continue;
      const secrets = decryptJson<Record<string, string>>(existing.credentialsEncrypted, getEncryptionKey());
      if (secrets[detected.field] === key) {
        const synced = await syncIntegration(existing);
        refresh();
        return synced.status === "ok"
          ? { ok: true, message: `${provider.name}: ключ уже подключён, данные обновлены` }
          : { error: `${provider.name}: ${synced.lastError}` };
      }
    }

    const record = await repo.createIntegration({
      provider: detected.provider,
      name: provider.name,
      config: {},
      credentialsEncrypted: encryptSecrets({ [detected.field]: key }),
    });
    const synced = await syncIntegration(record);
    refresh();
    return synced.status === "ok"
      ? { ok: true, message: `${provider.name} подключён и синхронизирован` }
      : { ok: true, warning: `${provider.name} добавлен, но синхронизация не удалась: ${synced.lastError}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось подключить сервис" };
  }
}

/** Обновляет только устаревшие интеграции (вызывается при открытии дашборда). */
export async function refreshStaleAction(): Promise<number> {
  await requireAuth();
  const stale = (await getRepository().listIntegrations()).filter((i) => isStale(i));
  if (stale.length === 0) return 0;
  await Promise.all(stale.map((i) => syncIntegration(i)));
  refresh();
  return stale.length;
}

export async function deleteIntegrationAction(id: string): Promise<void> {
  await requireAuth();
  await getRepository().deleteIntegration(id);
  refresh();
}

export async function syncIntegrationAction(id: string): Promise<void> {
  await requireAuth();
  const record = await getRepository().getIntegration(id);
  if (record) await syncIntegration(record);
  refresh();
}

export async function syncAllAction(): Promise<void> {
  await requireAuth();
  await syncAllIntegrations();
  refresh();
}
