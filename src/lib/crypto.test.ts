import { describe, expect, it } from "vitest";
import { decryptJson, encryptJson, maskSecret } from "./crypto";

describe("crypto", () => {
  it("round-trips JSON", () => {
    const payload = encryptJson({ token: "secret-value" }, "key");
    expect(payload.startsWith("v1.")).toBe(true);
    expect(payload).not.toContain("secret-value");
    expect(decryptJson(payload, "key")).toEqual({ token: "secret-value" });
  });
  it("fails with wrong key", () => {
    const payload = encryptJson({ a: 1 }, "key");
    expect(() => decryptJson(payload, "other")).toThrow();
  });
  it("masks secrets", () => {
    expect(maskSecret("sk-ant-admin01-abcdef1234")).toBe("sk-ant…1234");
  });
});
