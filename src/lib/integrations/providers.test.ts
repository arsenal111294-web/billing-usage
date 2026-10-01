import { describe, expect, it, vi } from "vitest";
import { anthropicProvider } from "./anthropic";
import { manualProvider } from "./manual";
import { netlifyProvider } from "./netlify";
import { openaiProvider } from "./openai";
import { supabaseProvider } from "./supabase";

type Route = [RegExp, unknown, number?];

function mockFetch(routes: Route[]) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes.find(([pattern]) => pattern.test(url));
    if (!route) return new Response("not found", { status: 404 });
    const [, body, status = 200] = route;
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
}

const now = new Date("2026-10-15T12:00:00Z");

describe("netlify", () => {
  it("collects build minutes, bandwidth and capabilities", async () => {
    const fetch = mockFetch([
      [/\/accounts$/, [{ id: "1", slug: "team", name: "Team", type_name: "Pro", capabilities: { sites: { included: 500, used: 3 } } }]],
      [/\/team\/builds\/status$/, [{ minutes: { current: 120, included_minutes: "300", period_end_date: "2026-11-01" } }]],
      [/\/accounts\/team\/bandwidth$/, { used: 1000, included: 5000 }],
    ]);
    const usage = await netlifyProvider.fetchUsage({ secrets: { token: "t" }, config: {}, fetch, now });
    expect(usage.plan).toBe("Pro");
    expect(usage.metrics).toEqual([
      expect.objectContaining({ key: "build_minutes", used: 120, limit: 300 }),
      expect.objectContaining({ key: "bandwidth", used: 1000, limit: 5000 }),
      expect.objectContaining({ key: "sites", used: 3, limit: 500 }),
    ]);
  });

  it("reports auth errors clearly", async () => {
    const fetch = mockFetch([[/\/accounts$/, { message: "Access Denied" }, 401]]);
    await expect(netlifyProvider.fetchUsage({ secrets: { token: "bad" }, config: {}, fetch, now })).rejects.toThrow(
      /неверный или недостаточный по правам токен/,
    );
  });
});

describe("anthropic", () => {
  it("sums cost (cents) and tokens across pages", async () => {
    let costCalls = 0;
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("cost_report")) {
        costCalls++;
        const body = url.includes("page=p2")
          ? { data: [{ results: [{ amount: "250.5", currency: "USD" }] }], has_more: false, next_page: null }
          : { data: [{ results: [{ amount: "1000", currency: "USD" }] }], has_more: true, next_page: "p2" };
        return new Response(JSON.stringify(body));
      }
      return new Response(
        JSON.stringify({
          data: [
            {
              results: [
                {
                  uncached_input_tokens: 100,
                  cache_creation: { ephemeral_5m_input_tokens: 10 },
                  cache_read_input_tokens: 50,
                  output_tokens: 20,
                },
              ],
            },
          ],
          has_more: false,
          next_page: null,
        }),
      );
    }) as unknown as typeof globalThis.fetch;

    const usage = await anthropicProvider.fetchUsage({
      secrets: { adminKey: "k" },
      config: { monthlyBudget: "50" },
      fetch,
      now,
    });
    expect(costCalls).toBe(2);
    const byKey = Object.fromEntries(usage.metrics.map((m) => [m.key, m]));
    expect(byKey.cost_month).toMatchObject({ used: 12.51, limit: 50, unit: "usd" });
    expect(byKey.input_tokens.used).toBe(110);
    expect(byKey.cache_read_tokens.used).toBe(50);
    expect(byKey.output_tokens.used).toBe(20);
    const firstUrl = String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(firstUrl).toContain("starting_at=2026-10-01T00%3A00%3A00.000Z");
  });
});

describe("openai", () => {
  it("sums costs and tokens", async () => {
    const fetch = mockFetch([
      [/\/costs\?/, { data: [{ results: [{ amount: { value: 1.25, currency: "usd" } }, { amount: { value: 0.75 } }] }], has_more: false, next_page: null }],
      [/\/usage\/completions\?/, { data: [{ results: [{ input_tokens: 5, output_tokens: 7 }] }], has_more: false, next_page: null }],
    ]);
    const usage = await openaiProvider.fetchUsage({ secrets: { adminKey: "k" }, config: {}, fetch, now });
    expect(usage.metrics[0]).toMatchObject({ key: "cost_month", used: 2, limit: null });
    expect(usage.metrics[1].used).toBe(5);
  });
});

describe("supabase", () => {
  it("applies plan quotas to project stats", async () => {
    const fetch = mockFetch([
      [/\/organizations$/, [{ id: "org1", name: "Org" }]],
      [/\/organizations\/org1$/, { id: "org1", name: "Org", plan: "free" }],
      [/\/projects$/, [
        { id: "ref1", name: "app", organization_id: "org1", status: "ACTIVE_HEALTHY" },
        { id: "ref2", name: "old", organization_id: "org1", status: "INACTIVE" },
        { id: "ref3", name: "other", organization_id: "org2", status: "ACTIVE_HEALTHY" },
      ]],
      [/\/projects\/ref1\/database\/query$/, [{ db_bytes: "104857600", storage_bytes: 10, mau: "42" }]],
    ]);
    const usage = await supabaseProvider.fetchUsage({ secrets: { token: "t" }, config: {}, fetch, now });
    expect(usage.plan).toBe("Free");
    const byKey = Object.fromEntries(usage.metrics.map((m) => [m.key, m]));
    expect(byKey.active_projects).toMatchObject({ used: 1, limit: 2 });
    expect(byKey["db_size:ref1"]).toMatchObject({ used: 104857600, limit: 500 * 1024 ** 2 });
    expect(byKey.mau).toMatchObject({ used: 42, limit: 50_000 });
  });
});

describe("manual", () => {
  it("returns entered values", async () => {
    const usage = await manualProvider.fetchUsage({
      secrets: {},
      config: { metricLabel: "Сообщения", used: "30", limit: "45", unit: "count" },
      fetch: globalThis.fetch,
      now,
    });
    expect(usage.metrics[0]).toMatchObject({ label: "Сообщения", used: 30, limit: 45, unit: "count" });
  });
});
