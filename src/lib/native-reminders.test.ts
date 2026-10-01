import { describe, expect, it } from "vitest";
import { buildNativeReminders, MAX_REMINDERS, notificationId } from "./native-reminders";
import type { Integration, Subscription } from "./types";

function sub(patch: Partial<Subscription>): Subscription {
  return {
    id: "s1",
    name: "Кинопоиск",
    category: "Кино",
    cost: 449,
    currency: "RUB",
    billingCycle: "monthly",
    nextBillingDate: "2026-10-05",
    status: "active",
    remindDaysBefore: 3,
    url: null,
    notes: null,
    integrationId: null,
    serviceKey: null,
    trialEndsAt: null,
    createdAt: "",
    updatedAt: "",
    ...patch,
  };
}

const integration: Integration = {
  id: "i1",
  provider: "netlify",
  name: "Netlify",
  config: {},
  status: "ok",
  lastSyncedAt: null,
  lastError: null,
  hasCredentials: true,
  createdAt: "",
  usage: { fetchedAt: "", metrics: [{ key: "credits", label: "Кредиты", used: 990, limit: 1000, unit: "credits" }] },
};

describe("buildNativeReminders", () => {
  it("планирует напоминания за N дней до каждого списания в горизонте 90 дней", () => {
    const reminders = buildNativeReminders([sub({})], [], "2026-10-01");
    expect(reminders.map((r) => r.date)).toEqual(["2026-10-02", "2026-11-02", "2026-12-02"]);
    expect(reminders[0]).toMatchObject({
      key: "charge:s1:2026-10-05",
      hour: 10,
      title: "Кинопоиск: списание через 3 дня",
      href: "/subscriptions?edit=s1",
    });
  });

  it("переносит на сегодня напоминание, день которого прошёл, и пропускает подписки на паузе", () => {
    const reminders = buildNativeReminders(
      [sub({ nextBillingDate: "2026-10-02" }), sub({ id: "s2", status: "paused" })],
      [],
      "2026-10-01",
    );
    expect(reminders.map((r) => [r.key, r.date])).toEqual([
      ["charge:s1:2026-10-02", "2026-10-01"],
      ["charge:s1:2026-11-02", "2026-10-30"],
      ["charge:s1:2026-12-02", "2026-11-29"],
    ]);
    expect(reminders[0].title).toBe("Кинопоиск: списание завтра");
  });

  it("отдельно предупреждает об окончании пробного периода", () => {
    const [first] = buildNativeReminders(
      [sub({ nextBillingDate: "2026-10-02", trialEndsAt: "2026-10-02", remindDaysBefore: 1 })],
      [],
      "2026-10-01",
    );
    expect(first.key).toBe("trial:s1:2026-10-02");
    expect(first.title).toBe("Кинопоиск: пробный период заканчивается завтра");
  });

  it("добавляет критичные лимиты как немедленные уведомления первыми", () => {
    const reminders = buildNativeReminders([sub({})], [integration], "2026-10-01");
    expect(reminders[0]).toMatchObject({ immediate: true, date: "2026-10-01" });
    expect(reminders[0].key.endsWith(":2026-10-01")).toBe(true);
  });

  it("ограничивает число уведомлений", () => {
    const many = Array.from({ length: 40 }, (_, i) => sub({ id: `s${i}` }));
    expect(buildNativeReminders(many, [], "2026-10-01")).toHaveLength(MAX_REMINDERS);
  });
});

describe("notificationId", () => {
  it("стабилен и укладывается в положительный int32", () => {
    const id = notificationId("charge:s1:2026-10-05");
    expect(id).toBe(notificationId("charge:s1:2026-10-05"));
    expect(id).not.toBe(notificationId("charge:s1:2026-11-05"));
    expect(id).toBeGreaterThan(0);
    expect(id).toBeLessThanOrEqual(2 ** 31 - 1);
  });
});
