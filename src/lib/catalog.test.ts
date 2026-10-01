import { describe, expect, it } from "vitest";
import { buildAlerts } from "./alerts";
import { bundleOverlaps } from "./bundles";
import { CATALOG, CATALOG_CATEGORIES, getCatalogService, searchCatalog } from "./catalog";
import { PROVIDERS } from "./integrations";
import type { Integration, Subscription } from "./types";

describe("catalog", () => {
  it("has 50 unique services with valid references", () => {
    expect(CATALOG).toHaveLength(50);
    expect(new Set(CATALOG.map((s) => s.key)).size).toBe(50);
    for (const service of CATALOG) {
      expect(CATALOG_CATEGORIES).toContain(service.category);
      expect(service.plans.length).toBeGreaterThan(0);
      for (const key of service.includes ?? []) expect(getCatalogService(key), `${service.key} → ${key}`).not.toBeNull();
      if (service.integration) expect(PROVIDERS[service.integration]).toBeDefined();
    }
  });

  it("searches case- and ё-insensitively", () => {
    expect(searchCatalog("окко").map((s) => s.key)).toEqual(["okko"]);
    expect(searchCatalog("OKKO").map((s) => s.key)).toEqual(["okko"]);
    expect(searchCatalog("клод").map((s) => s.key)).toEqual(["claude"]);
    expect(searchCatalog("яндекс").map((s) => s.key)).toContain("yandex-plus");
  });
});

function sub(partial: Partial<Subscription>): Subscription {
  return {
    id: partial.serviceKey ?? "x",
    name: "x",
    category: null,
    cost: 449,
    currency: "RUB",
    billingCycle: "monthly",
    nextBillingDate: "2026-10-20",
    status: "active",
    remindDaysBefore: 3,
    url: null,
    notes: null,
    integrationId: null,
    serviceKey: null,
    trialEndsAt: null,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("bundles and trials", () => {
  const plus = sub({ id: "plus", name: "Яндекс Плюс", serviceKey: "yandex-plus" });
  const kp = sub({ id: "kp", name: "Кинопоиск", serviceKey: "kinopoisk", cost: 449 });
  const okkoTrial = sub({ id: "okko", name: "Okko", serviceKey: "okko", cost: 399, nextBillingDate: "2026-10-02", trialEndsAt: "2026-10-02" });

  it("finds services already included in an owned bundle", () => {
    expect(bundleOverlaps([plus, kp, okkoTrial]).map((o) => [o.included.name, o.bundle.name, o.monthlyWaste])).toEqual([
      ["Кинопоиск", "Яндекс Плюс", 449],
    ]);
    expect(bundleOverlaps([{ ...plus, status: "paused" }, kp])).toHaveLength(0);
  });

  it("builds trial, duplicate and low-balance alerts", () => {
    const timeweb: Integration = {
      id: "tw",
      provider: "timeweb",
      name: "Timeweb Cloud",
      config: {},
      status: "ok",
      lastSyncedAt: null,
      lastError: null,
      hasCredentials: true,
      createdAt: "",
      usage: { fetchedAt: "", metrics: [{ key: "days_left", label: "Денег хватит на", used: 2, limit: null, unit: "days", warnBelow: 7 }] },
    };
    const alerts = buildAlerts([plus, kp, okkoTrial], [timeweb], "2026-10-01");
    const kinds = Object.fromEntries(alerts.map((a) => [a.kind, a]));
    expect(kinds.trial.title).toBe("Okko: пробный период заканчивается завтра");
    expect(kinds.trial.message).toContain("399");
    expect(kinds.duplicate.title).toBe("Кинопоиск уже входит в Яндекс Плюс");
    expect(kinds.balance).toMatchObject({ severity: "critical", title: "Timeweb Cloud: денег хватит на — 2 дня" });
  });
});
