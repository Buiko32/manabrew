import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchSets: vi.fn<() => Promise<unknown[]>>(),
  setScryfallState: vi.fn(),
  prefetchCards: vi.fn<() => Promise<void>>(),
  prefetchTokenArchive: vi.fn<() => Promise<void>>(),
  prefetchPresetDecks: vi.fn<() => Promise<void>>(),
  engineInit: vi.fn<() => Promise<void>>(),
  stages: [] as string[],
}));

vi.mock("@/stores/useScryfallStore", () => ({
  prefetchCards: mocks.prefetchCards,
  prefetchTokenArchive: mocks.prefetchTokenArchive,
  useScryfallStore: {
    getState: () => ({ fetchSets: mocks.fetchSets }),
    setState: mocks.setScryfallState,
  },
}));
vi.mock("@/stores/useDeckStore", () => ({ useDeckStore: { getState: () => ({}) } }));
vi.mock("@/components/deck/deckCover.utils", () => ({ resolveCoverCard: () => null }));
vi.mock("@/stores/usePresetDecksStore", () => ({
  prefetchPresetDecks: mocks.prefetchPresetDecks,
  usePresetDecksStore: { getState: () => ({ decks: [] }) },
}));
vi.mock("@/stores/useForgeRoomAvailabilityStore", () => ({
  initializeForgeRoomAvailability: () => Promise.resolve(),
}));
vi.mock("@/platform", () => ({
  getEventBus: () => ({
    emit: (_event: string, payload: { stage: string }) => mocks.stages.push(payload.stage),
  }),
  getPlatform: () => ({ init: mocks.engineInit }),
}));

describe("initApp", () => {
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    vi.resetModules();
    mocks.fetchSets.mockReset();
    mocks.setScryfallState.mockReset();
    mocks.prefetchCards.mockReset();
    mocks.prefetchTokenArchive.mockReset();
    mocks.prefetchPresetDecks.mockReset();
    mocks.engineInit.mockReset().mockResolvedValue();
    mocks.stages.length = 0;
  });

  it("releases the init gate when remote warmup hangs", async () => {
    vi.useFakeTimers();
    mocks.fetchSets.mockReturnValue(new Promise(() => {}));
    mocks.prefetchTokenArchive.mockResolvedValue();
    mocks.prefetchPresetDecks.mockResolvedValue();
    const { initApp } = await import("@/lib/appInit");

    const startup = initApp();
    await vi.advanceTimersByTimeAsync(12_000);
    await startup;

    expect(mocks.stages).toContain("ready");
  });

  it("does not wait for deck cover image warming before releasing the init gate", async () => {
    mocks.fetchSets.mockResolvedValue([]);
    mocks.prefetchTokenArchive.mockResolvedValue();
    mocks.prefetchPresetDecks.mockResolvedValue();
    mocks.prefetchCards.mockReturnValue(new Promise(() => {}));
    const { initApp } = await import("@/lib/appInit");

    await initApp();

    expect(mocks.prefetchCards).toHaveBeenCalledOnce();
    expect(mocks.stages.at(-1)).toBe("ready");
  });
});
