import { afterEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const stores = vi.hoisted(() => ({
  game: {
    isGameActive: false,
    isMultiplayer: false,
    gameView: null,
    currentPrompt: null,
    myPlayerSlot: null,
  },
  server: { reconnect: { phase: "idle" as "idle" | "reconnecting" | "failed", attempt: 0 } },
}));

vi.mock("@/stores/useGameStore", () => ({
  useGameStore: (selector: (state: typeof stores.game) => unknown) => selector(stores.game),
}));
vi.mock("@/stores/useServerStore", () => ({
  useServerStore: (selector: (state: typeof stores.server) => unknown) => selector(stores.server),
}));

import { ReconnectBanner } from "@/components/lobby/ReconnectBanner";

afterEach(() => {
  stores.game.isGameActive = false;
  stores.game.isMultiplayer = false;
  stores.server.reconnect = { phase: "idle", attempt: 0 };
});

describe("ReconnectBanner", () => {
  it("does not show relay retries during an offline game", () => {
    stores.game.isGameActive = true;
    stores.game.isMultiplayer = false;
    stores.server.reconnect = { phase: "reconnecting", attempt: 5 };

    expect(renderToStaticMarkup(createElement(ReconnectBanner))).toBe("");
  });

  it("shows relay retries during an active multiplayer game", () => {
    stores.game.isGameActive = true;
    stores.game.isMultiplayer = true;
    stores.server.reconnect = { phase: "reconnecting", attempt: 5 };

    expect(renderToStaticMarkup(createElement(ReconnectBanner))).toContain("attempt 5");
  });
});
