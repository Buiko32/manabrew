import type { CardDto } from "@/protocol/game";
import { hiddenZoneCard } from "@/lib/gameCard";
import type { OpponentHandFanMode } from "@/stores/usePreferencesStore";

interface OpponentHandView {
  id: string;
  hand: CardDto[];
  handCount: number;
}

/**
 * Receiving a card identity in a game state is not, by itself, permission
 * to expose the opponent's hand during a normal match. The AI Lab spectator
 * is the only view intentionally granted an omniscient opponent hand.
 */
export function opponentVisibleHandCards(
  player: OpponentHandView,
  isAiLabSpectator: boolean,
): CardDto[] {
  return isAiLabSpectator ? player.hand : [];
}

export function opponentHandFanCards(
  player: OpponentHandView,
  mode: OpponentHandFanMode,
  isAiLabSpectator: boolean,
): CardDto[] {
  if (mode === "never" || (!isAiLabSpectator && mode !== "always")) return [];

  // In ordinary matches, "always" displays card backs only. A temporary
  // opponent-hand payload must never make the card faces appear at the top.
  const visible = opponentVisibleHandCards(player, isAiLabSpectator);
  return [
    ...visible,
    ...Array.from(
      { length: Math.max(0, player.handCount - visible.length) },
      (_, index) => hiddenZoneCard(`${player.id}-hand-hidden-${index}`, player.id, "hand"),
    ),
  ];
}
