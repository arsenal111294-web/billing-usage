import { describe, expect, it, vi } from "vitest";
import { begetProvider } from "./beget";
import { deepseekProvider } from "./deepseek";
import { openrouterProvider } from "./openrouter";
import { selectelProvider } from "./selectel";
import { timewebProvider } from "./timeweb";
import { yandexCloudProvider } from "./yandex-cloud";

function mockFetch(routes: [RegExp, unknown, number?][]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const route = routes.find(([pattern]) => pattern.test(url));
    if (!route) return new Response("not found", { status: 404 });
    void init;
    return new Response(JSON.stringify(route[1]), { status: route[2] ?? 200 });
  }) as unknown as typeof fetch;
}

const now = new Date("2026-10-15T12:00:00Z");
const byKey = (metrics: { key: string }[]) => Object.fromEntries(metrics.map((m) => [m.key, m]));

describe("timeweb", () => {
  it("reads balance, monthly cost and days left", async () => {
    const fetch = mockFetch([[/account\/finances$/, { finances: { balance: 1234.5, currency: "RUB", monthly_cost: 900, hours_left: 1000 } }]]);
    const usage = await timewebProvider.fetchUsage({ secrets: { token: "t" }, config: {}, fetch, now });
    const m = byKey(usage.metrics);
    expect(m.balance).toMatchObject({ used: 1234.5, unit: "rub" });
    expect(m.monthly_cost).toMatchObject({ used: 900 });
    expect(m.days_left).toMatchObject({ used: 41, unit: "days", warnBelow: 7 });
  });
});

describe("selectel", () => {
  it("converts kopecks to rubles and reports debt", async () => {
    const fetch = mockFetch([
      [/v3\/balances$/, { data: { settings: { currency: "rub" }, billings: [{ final_sum: 150000, debt_sum: 0 }, { final_sum: 2550, debt_sum: 1000 }] } }],
    ]);
    const usage = await selectelProvider.fetchUsage({ secrets: { token: "t" }, config: {}, fetch, now });
    const m = byKey(usage.metrics);
    expect(m.balance).toMatchObject({ used: 1525.5, unit: "rub" });
    expect(m.debt).toMatchObject({ used: 10 });
  });
});

describe("yandex cloud", () => {
  it("exchanges OAuth for IAM and lists billing accounts", async () => {
    const fetch = mockFetch([
      [/iam\/v1\/tokens$/, { iamToken: "iam" }],
      [/billingAccounts$/, { billingAccounts: [{ id: "b1", name: "main", currency: "RUB", active: true, balance: "321.45" }] }],
    ]);
    const usage = await yandexCloudProvider.fetchUsage({ secrets: { oauthToken: "y0_x" }, config: {}, fetch, now });
    expect(usage.metrics[0]).toMatchObject({ key: "balance:b1", label: "Баланс", used: 321.45, unit: "rub" });
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(JSON.parse(String(calls[0][1].body))).toEqual({ yandexPassportOauthToken: "y0_x" });
    expect(calls[1][1].headers.Authorization).toBe("Bearer iam");
  });
});

describe("beget", () => {
  it("reads balance and days to block", async () => {
    const fetch = mockFetch([
      [
        /getAccountInfo/,
        { status: "success", answer: { status: "success", result: { plan_name: "Blog", user_balance: 512.3, user_days_to_block: 45, user_rate_month: 330 } } },
      ],
    ]);
    const usage = await begetProvider.fetchUsage({ secrets: { apiPassword: "p" }, config: { login: "me" }, fetch, now });
    expect(usage.plan).toBe("Blog");
    const m = byKey(usage.metrics);
    expect(m.balance).toMatchObject({ used: 512.3 });
    expect(m.days_left).toMatchObject({ used: 45, warnBelow: 7 });
    const url = String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(url).toContain("login=me");
  });

  it("surfaces API errors", async () => {
    const fetch = mockFetch([[/getAccountInfo/, { status: "error", error_text: "Auth failed" }]]);
    await expect(begetProvider.fetchUsage({ secrets: { apiPassword: "p" }, config: { login: "me" }, fetch, now })).rejects.toThrow(
      "Beget: Auth failed",
    );
  });
});

describe("deepseek", () => {
  it("reads balance per currency", async () => {
    const fetch = mockFetch([
      [/user\/balance$/, { is_available: true, balance_infos: [{ currency: "CNY", total_balance: "110.00", granted_balance: "10.00", topped_up_balance: "100.00" }] }],
    ]);
    const usage = await deepseekProvider.fetchUsage({ secrets: { apiKey: "k" }, config: {}, fetch, now });
    expect(usage.metrics[0]).toMatchObject({ used: 110, unit: "cny", note: "из них бонусных: 10.00" });
  });
});

describe("openrouter", () => {
  it("shows usage against purchased credits", async () => {
    const fetch = mockFetch([[/api\/v1\/credits$/, { data: { total_credits: 50, total_usage: 42.123 } }]]);
    const usage = await openrouterProvider.fetchUsage({ secrets: { apiKey: "k" }, config: {}, fetch, now });
    expect(usage.metrics[0]).toMatchObject({ used: 42.12, limit: 50, unit: "usd" });
  });
});
