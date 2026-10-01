import { monthlyEquivalent } from "./billing";
import { getCatalogService } from "./catalog";
import type { Subscription } from "./types";

export interface BundleOverlap {
  /** Отдельно оплачиваемая подписка, которая уже входит в пакет. */
  included: Subscription;
  /** Подписка-пакет (Яндекс Плюс, СберПрайм…). */
  bundle: Subscription;
  /** Сколько в месяц уходит на дубль (в валюте подписки included). */
  monthlyWaste: number;
}

/** Активные подписки, которые уже входят в другую активную подписку-пакет. */
export function bundleOverlaps(subscriptions: Subscription[]): BundleOverlap[] {
  const active = subscriptions.filter((s) => s.status === "active" && s.serviceKey);
  const overlaps: BundleOverlap[] = [];
  for (const bundle of active) {
    const includes = getCatalogService(bundle.serviceKey)?.includes ?? [];
    for (const included of active) {
      if (included.id === bundle.id || !includes.includes(included.serviceKey!)) continue;
      overlaps.push({ included, bundle, monthlyWaste: Math.round(monthlyEquivalent(included) * 100) / 100 });
    }
  }
  return overlaps;
}
