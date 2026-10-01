import { describe, expect, it } from "vitest";
import { detectKey } from "./detect";

describe("detectKey", () => {
  it.each([
    ["nfp_abc", "netlify", "token"],
    ["  sbp_123  ", "supabase", "token"],
    ["sk-ant-admin01-xyz", "anthropic", "adminKey"],
    ["sk-admin-abc", "openai", "adminKey"],
    ["sk-or-v1-abc", "openrouter", "apiKey"],
    ["sk-0123456789abcdef0123456789abcdef", "deepseek", "apiKey"],
    ["y0_AgAAAA", "yandex_cloud", "oauthToken"],
  ])("%s → %s", (key, provider, field) => {
    expect(detectKey(key)).toEqual({ provider, field });
  });

  it("explains wrong key types", () => {
    expect(detectKey("sk-ant-api03-x")).toMatchObject({ error: expect.stringContaining("Admin") });
    expect(detectKey("sb_secret_x")).toMatchObject({ error: expect.stringContaining("sbp_") });
    expect(detectKey("eyJhbGciOi")).toMatchObject({ error: expect.stringContaining("Timeweb") });
    expect(detectKey("sk-proj-abc")).toMatchObject({ error: expect.stringContaining("Admin") });
    expect(detectKey("whatever")).toMatchObject({ error: expect.any(String) });
  });
});
