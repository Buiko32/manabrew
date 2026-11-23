import { describe, expect, it } from "vitest";
import type { CardDto } from "@/protocol/game";
import { opponentHandFanCards, opponentVisibleHandCards } from "./opponentHandVisibility";

const card = {
  id: "private-opponent-card",
  identity: { name: "Private card" },
  isFaceDown: false,
} as CardDto;
const opponent = { id: "player-1", hand: [card], handCount: 3 };

describe("opponent hand privacy", () => {
  it("does not display a transient opponent hand in a normal match", () => {
    expect(opponentHandFanCards(opponent, "revealed", false)).toEqual([]);
    expect(opponentVisibleHandCards(opponent, false)).toEqual([]);
  });

  it("shows only card backs when always-on opponent hand fan is selected", () => {
    const cards = opponentHandFanCards(opponent, "always", false);
    expect(cards).toHaveLength(3);
    expect(cards.every((c) => c.isFaceDown && !c.identity.name)).toBe(true);
    expect(cards.some((c) => c.id === card.id)).toBe(false);
  });

  it("keeps full hand information available to explicit AI Lab spectators", () => {
    const cards = opponentHandFanCards(opponent, "revealed", true);
    expect(cards).toHaveLength(3);
    expect(cards[0]).toBe(card);
    expect(opponentVisibleHandCards(opponent, true)).toEqual([card]);
  });

  it("respects the never setting even in spectator mode", () => {
    expect(opponentHandFanCards(opponent, "never", true)).toEqual([]);
  });
});
