// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./constants";

async function load() {
  vi.resetModules();
  return import("./forgeWasm");
}

function storeVerdict(verdict: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEYS.FORGE_WASM_VALIDATION, JSON.stringify(verdict));
}

describe("forge wasm trial verdict", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "crossOriginIsolated", { value: true, configurable: true });
    Object.assign(window, { __MANABREW_RUNTIME__: { featureFlags: { forgeWasm: true } } });
    (globalThis as { SharedArrayBuffer?: unknown }).SharedArrayBuffer ??= ArrayBuffer;
  });

  it("retries a timed-out trial on a later day", async () => {
    const fresh = await load();
    storeVerdict({
      url: fresh.FORGE_WASM_URL,
      ok: false,
      failure: "timeout",
      at: Date.now() - fresh.TRIAL_RETRY_AFTER_MS - 1,
      attempts: 1,
    });
    const mod = await load();
    expect(mod.forgeWasmNeedsValidation()).toBe(true);
    expect(mod.forgeWasmGate()).not.toBe("trial_timeout");
  });

  it("holds a timed-out trial until the retry window passes", async () => {
    const fresh = await load();
    storeVerdict({
      url: fresh.FORGE_WASM_URL,
      ok: false,
      failure: "timeout",
      at: Date.now(),
      attempts: 1,
    });
    const mod = await load();
    expect(mod.forgeWasmNeedsValidation()).toBe(false);
    expect(mod.forgeWasmGate()).toBe("trial_timeout");
  });

  it("stops retrying a timeout after the attempt cap", async () => {
    const fresh = await load();
    storeVerdict({
      url: fresh.FORGE_WASM_URL,
      ok: false,
      failure: "timeout",
      at: 0,
      attempts: fresh.MAX_TRIAL_ATTEMPTS,
    });
    const mod = await load();
    expect(mod.forgeWasmNeedsValidation()).toBe(false);
    expect(mod.forgeWasmGate()).toBe("trial_timeout");
  });

  it("never retries a trial the engine itself failed", async () => {
    const fresh = await load();
    storeVerdict({
      url: fresh.FORGE_WASM_URL,
      ok: false,
      failure: "engine",
      at: 0,
      attempts: 1,
    });
    const mod = await load();
    expect(mod.forgeWasmNeedsValidation()).toBe(false);
    expect(mod.forgeWasmGate()).toBe("trial_failed");
  });

  it("treats a trial that never finished as a timeout, not a verdict", async () => {
    const fresh = await load();
    storeVerdict({ url: fresh.FORGE_WASM_URL, ok: null, at: 0, attempts: 0 });
    const mod = await load();
    expect(mod.forgeWasmNeedsValidation()).toBe(true);
  });

  it("blocks local Forge startup on iOS and points to hosted play", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)",
      configurable: true,
    });

    const mod = await load();

    expect(mod.forgeWasmGate()).toBe("ios");
    expect(mod.forgeWasmStartError()).toMatch(/hosted Forge/i);
    expect(mod.resolveWebForgeLaunchRoute(true)).toBe("hosted");
    expect(mod.resolveWebForgeLaunchRoute(false)).toBe("unsupported");
    expect(() => mod.assertForgeWasmCanStart("Forge")).toThrow(/hosted Forge/i);
    expect(() => mod.assertForgeWasmCanStart("Ironsmith")).not.toThrow();
    expect(() => mod.assertForgeWasmCanStart(undefined)).not.toThrow();
  });

  it("allows local Forge startup on a supported browser", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
      configurable: true,
    });

    const mod = await load();

    expect(mod.forgeWasmGate()).toBe("in_browser");
    expect(mod.forgeWasmStartError()).toBeNull();
    expect(mod.resolveWebForgeLaunchRoute(true)).toBe("local");
    expect(() => mod.assertForgeWasmCanStart("Forge")).not.toThrow();
  });

  it("counts attempts across successive timeouts", async () => {
    const mod = await load();
    mod.recordForgeWasmVerdict(false, "timeout", "engine did not start in time");
    mod.recordForgeWasmVerdict(false, "timeout", "engine did not start in time");
    const raw = localStorage.getItem(STORAGE_KEYS.FORGE_WASM_VALIDATION) ?? "{}";
    expect(JSON.parse(raw).attempts).toBe(2);
  });

  it("clears the failure once a trial succeeds", async () => {
    const mod = await load();
    mod.recordForgeWasmVerdict(false, "timeout");
    mod.recordForgeWasmVerdict(true);
    const raw = localStorage.getItem(STORAGE_KEYS.FORGE_WASM_VALIDATION) ?? "{}";
    const verdict = JSON.parse(raw);
    expect(verdict.ok).toBe(true);
    expect(verdict.failure).toBeUndefined();
  });
});
