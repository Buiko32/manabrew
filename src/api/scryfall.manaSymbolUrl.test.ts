import { afterEach, describe, expect, it, vi } from "vitest";

const getPlatformType = vi.hoisted(() => vi.fn(() => "web"));

vi.mock("@/platform", () => ({ getPlatformType }));

describe("manaSymbolUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    getPlatformType.mockReturnValue("web");
  });

  it("uses the default same-origin path for web builds", async () => {
    vi.resetModules();

    const { manaSymbolUrl } = await import("./scryfall");

    expect(manaSymbolUrl("W")).toBe("/scryfall-symbols/W.svg");
  });

  it("uses a configured symbol base", async () => {
    vi.stubEnv("VITE_SCRYFALL_SYMBOL_BASE", "/custom-symbols/");
    vi.resetModules();

    const { manaSymbolUrl } = await import("./scryfall");

    expect(manaSymbolUrl("W/U")).toBe("/custom-symbols/WU.svg");
  });

  it("keeps mana symbols on the symbol proxy when the asset mirror is configured", async () => {
    vi.stubEnv("VITE_SCRYFALL_ASSET_BASE", "https://assets.example/__assets/");
    vi.stubEnv("VITE_SCRYFALL_SYMBOL_BASE", "/scryfall-symbols/");
    vi.resetModules();

    const { manaSymbolUrl } = await import("./scryfall");

    expect(manaSymbolUrl("W")).toBe("/scryfall-symbols/W.svg");
  });

  it("uses the asset mirror when no symbol base is configured", async () => {
    vi.stubEnv("VITE_SCRYFALL_ASSET_BASE", "https://assets.example/__assets/");
    vi.resetModules();

    const { manaSymbolUrl } = await import("./scryfall");

    expect(manaSymbolUrl("W/U")).toBe("https://assets.example/__assets/card-symbols/WU.svg");
  });

  it("uses the Scryfall filename override through the symbol proxy", async () => {
    vi.resetModules();

    const { manaSymbolUrl } = await import("./scryfall");

    expect(manaSymbolUrl("½")).toBe("/scryfall-symbols/HALF.svg");
  });

  it("uses the Scryfall origin for Tauri when no custom bases are set", async () => {
    getPlatformType.mockReturnValue("tauri");
    vi.resetModules();

    const { manaSymbolUrl } = await import("./scryfall");

    expect(manaSymbolUrl("W")).toBe("https://svgs.scryfall.io/card-symbols/W.svg");
  });

  it("uses the asset mirror for Tauri when no symbol base is configured", async () => {
    getPlatformType.mockReturnValue("tauri");
    vi.stubEnv("VITE_SCRYFALL_ASSET_BASE", "https://assets.example/__assets/");
    vi.resetModules();

    const { manaSymbolUrl } = await import("./scryfall");

    expect(manaSymbolUrl("W")).toBe("https://assets.example/__assets/card-symbols/W.svg");
  });
});
