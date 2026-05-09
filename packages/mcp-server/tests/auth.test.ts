import { describe, expect, it } from "vitest";
import { hashApiKey, generateApiKey } from "../src/auth.js";

describe("auth helpers", () => {
  it("generates kx_ prefixed keys with at least 32 random bytes", () => {
    const key = generateApiKey("live");
    expect(key.startsWith("kx_live_")).toBe(true);
    expect(key.length).toBeGreaterThan(40);
  });

  it("hashApiKey is deterministic for the same secret", () => {
    const secret = "0123456789abcdef0123456789abcdef";
    const a = hashApiKey("kx_live_abc", secret);
    const b = hashApiKey("kx_live_abc", secret);
    expect(a).toBe(b);
  });

  it("hashApiKey changes when the secret changes", () => {
    const a = hashApiKey("kx_live_abc", "0123456789abcdef0123456789abcdef");
    const b = hashApiKey("kx_live_abc", "fedcba9876543210fedcba9876543210");
    expect(a).not.toBe(b);
  });

  it("hashApiKey changes when the key changes", () => {
    const secret = "0123456789abcdef0123456789abcdef";
    const a = hashApiKey("kx_live_abc", secret);
    const b = hashApiKey("kx_live_xyz", secret);
    expect(a).not.toBe(b);
  });
});
