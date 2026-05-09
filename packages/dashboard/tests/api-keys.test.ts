import { describe, expect, it, beforeEach, vi } from "vitest";

beforeEach(() => {
  process.env.API_KEY_HMAC_SECRET = "0123456789abcdef0123456789abcdef";
  vi.resetModules();
});

describe("hashApiKey", () => {
  it("is deterministic for the same secret and key", async () => {
    const mod = await import("../lib/api-keys");
    const a = mod.hashApiKey("kx_live_xyz");
    const b = mod.hashApiKey("kx_live_xyz");
    expect(a).toBe(b);
  });

  it("changes when the input changes", async () => {
    const mod = await import("../lib/api-keys");
    const a = mod.hashApiKey("kx_live_aaa");
    const b = mod.hashApiKey("kx_live_bbb");
    expect(a).not.toBe(b);
  });

  it("produces a 64-char hex digest", async () => {
    const mod = await import("../lib/api-keys");
    expect(mod.hashApiKey("kx_live_xyz")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("generateRawApiKey", () => {
  it("uses the kx_ prefix and an explicit kind", async () => {
    const mod = await import("../lib/api-keys");
    const live = mod.generateRawApiKey("live");
    const session = mod.generateRawApiKey("session");
    expect(live.startsWith("kx_live_")).toBe(true);
    expect(session.startsWith("kx_session_")).toBe(true);
    expect(live).not.toBe(session);
  });
});
