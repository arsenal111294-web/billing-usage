import { describe, expect, it } from "vitest";
import { buildAlerts, limitBreaches } from "./alerts";
import { renderDigest } from "./notifications/templates";
import type { Integration, Subscription } from "./types";

const subscription: Subscription = {
  id: "s1",
  name: "Claude <Pro>",
  category: "AI",
  cost: 20,
  currency: "USD",
  billingCycle: "monthly",
  nextBillingDate: "2026-10-02",
  status: "active",
  remindDaysBefore: 3,
  url: null,
  notes: null,
  integrationId: null,
  createdAt: "",
  updatedAt: "",
};

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
  usage: {
    fetchedAt: "",
    metrics: [
      { key: "min", label: "Минуты", used: 960, limit: 1000, unit: "minutes" },
      { key: "bw", label: "Трафик", used: 10, limit: 100, unit: "bytes" },
      { key: "tok", label: "Токены", used: 10, limit: null, unit: "tokens" },
    ],
  },
};

describe("alerts", () => {
  it("builds charge and limit alerts sorted by severity", () => {
    const alerts = buildAlerts([subscription], [integration], "2026-10-01");
    expect(alerts.map((a) => [a.kind, a.severity])).toEqual([
      ["charge", "critical"],
      ["limit", "critical"],
    ]);
    expect(alerts[0].title).toContain("завтра");
  });

  it("finds limit breaches above threshold only", () => {
    expect(limitBreaches([integration], 0.8)).toHaveLength(1);
    expect(limitBreaches([integration], 0.97)).toHaveLength(0);
  });
});

describe("renderDigest", () => {
  it("escapes HTML and includes all channels' bodies", () => {
    const message = renderDigest({
      charges: [{ subscription, date: "2026-10-02", daysLeft: 1 }],
      limits: limitBreaches([integration]),
      appUrl: "https://example.com",
    });
    expect(message.subject).toContain("списаний: 1");
    expect(message.html).toContain("Claude &lt;Pro&gt;");
    expect(message.telegram).toContain("Claude &lt;Pro&gt;");
    expect(message.telegram).not.toContain("<Pro>");
    expect(message.text).toContain("96%");
  });
});

describe("informational metrics", () => {
  it("never raise limit alerts", () => {
    const seats: Integration = {
      ...integration,
      usage: { fetchedAt: "", metrics: [{ key: "seats", label: "Места", used: 1, limit: 1, unit: "count", alerting: false }] },
    };
    expect(limitBreaches([seats], 0.8)).toHaveLength(0);
  });
});
