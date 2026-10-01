import { describe, expect, it } from "vitest";
import {
  chargeDatesBetween,
  computeTotals,
  dueReminders,
  effectiveNextBillingDate,
  forecastCharges,
  monthlyEquivalent,
} from "./billing";
import { addMonths } from "./dates";
import type { Subscription } from "./types";

function sub(partial: Partial<Subscription>): Subscription {
  return {
    id: partial.name ?? "id",
    name: "Test",
    category: null,
    cost: 10,
    currency: "USD",
    billingCycle: "monthly",
    nextBillingDate: "2026-10-15",
    status: "active",
    remindDaysBefore: 3,
    url: null,
    notes: null,
    integrationId: null,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

const rates = { USD: 1, EUR: 0.5 };

describe("dates", () => {
  it("clamps to end of month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });
});

describe("effectiveNextBillingDate", () => {
  it("keeps future dates", () => {
    expect(effectiveNextBillingDate(sub({ nextBillingDate: "2026-10-20" }), "2026-10-01")).toBe("2026-10-20");
  });
  it("rolls past dates forward by cycle, keeping the anchor day", () => {
    const s = sub({ nextBillingDate: "2026-01-31" });
    expect(effectiveNextBillingDate(s, "2026-03-01")).toBe("2026-03-31");
    expect(effectiveNextBillingDate(sub({ nextBillingDate: "2025-06-10", billingCycle: "yearly" }), "2026-10-01")).toBe(
      "2027-06-10",
    );
  });
});

describe("chargeDatesBetween", () => {
  it("lists monthly charges without day drift", () => {
    expect(chargeDatesBetween(sub({ nextBillingDate: "2026-01-31" }), "2026-01-01", "2026-05-01")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });
});

describe("totals", () => {
  it("normalizes yearly and converts currency, ignoring paused", () => {
    const subs = [
      sub({ cost: 120, billingCycle: "yearly", category: "Dev" }),
      sub({ cost: 5, currency: "EUR", category: "AI" }),
      sub({ cost: 999, status: "paused" }),
    ];
    expect(monthlyEquivalent(subs[0])).toBe(10);
    const totals = computeTotals(subs, "USD", rates);
    expect(totals.monthly).toBe(20);
    expect(totals.yearly).toBe(240);
    expect(totals.activeCount).toBe(2);
    expect(totals.pausedCount).toBe(1);
    expect(totals.byCategory).toEqual([
      { category: "Dev", monthly: 10 },
      { category: "AI", monthly: 10 },
    ]);
  });
});

describe("forecastCharges", () => {
  it("puts yearly charges in their month", () => {
    const subs = [sub({ cost: 10 }), sub({ cost: 100, billingCycle: "yearly", nextBillingDate: "2027-02-01" })];
    const forecast = forecastCharges(subs, "2026-10-01", "USD", rates, 12);
    expect(forecast).toHaveLength(12);
    expect(forecast[0]).toMatchObject({ month: "2026-10", total: 10 });
    expect(forecast[4]).toMatchObject({ month: "2027-02", total: 110 });
  });
});

describe("dueReminders", () => {
  it("respects remindDaysBefore per subscription", () => {
    const subs = [
      sub({ name: "a", nextBillingDate: "2026-10-03", remindDaysBefore: 3 }),
      sub({ name: "b", nextBillingDate: "2026-10-03", remindDaysBefore: 1 }),
      sub({ name: "c", nextBillingDate: "2026-10-02", status: "paused" }),
    ];
    expect(dueReminders(subs, "2026-10-01").map((c) => [c.subscription.name, c.daysLeft])).toEqual([["a", 2]]);
  });
});
