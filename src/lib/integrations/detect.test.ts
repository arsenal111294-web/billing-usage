import { describe, expect, it } from "vitest";
import { detectKey } from "./detect";

describe("detectKey", () => {
  it.each([
    ["nfp_abc", "netlify", "token"],
    ["  sbp_123  ", "supabase", "token"],
    ["sk-ant-admin01-xyz", "anthropic", "adminKey"],
    ["sk-admin-abc", "openai", "adminKey"],
  ])("%s → %s", (key, provider, field) => {
    expect(detectKey(key)).toEqual({ provider, field });
  });

  it("explains wrong key types", () => {
    expect(detectKey("sk-ant-api03-x")).toMatchObject({ error: expect.stringContaining("Admin") });
    expect(detectKey("sb_secret_x")).toMatchObject({ error: expect.stringContaining("sbp_") });
    expect(detectKey("whatever")).toMatchObject({ error: expect.any(String) });
  });
});
