import type { Integration } from "../types";

/** Данные старше этого возраста обновляются автоматически при открытии страниц. */
export const STALE_AFTER_MS = 15 * 60 * 1000;

/** Нужно ли подтянуть свежие данные: ручные и демо-интеграции не обновляются. */
export function isStale(integration: Pick<Integration, "provider" | "config" | "lastSyncedAt">, now = Date.now()): boolean {
  if (integration.provider === "manual" || integration.config.demo === "1") return false;
  return !integration.lastSyncedAt || now - Date.parse(integration.lastSyncedAt) > STALE_AFTER_MS;
}
