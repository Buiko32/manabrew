import { stripUsernameTag } from "@/lib/username";

const SELF_HOSTED_BOT_PREFIX = "self-hosted-node-";

interface PlayerName {
  name: string;
}

interface RoomPlayerName {
  username: string;
  is_bot?: boolean;
}

export function displayPlayerNames(
  players: readonly PlayerName[],
  roomPlayers: readonly RoomPlayerName[],
): string[] {
  const hostedBotNames = new Set(
    roomPlayers
      .filter((player) => player.is_bot && player.username.startsWith(SELF_HOSTED_BOT_PREFIX))
      .map((player) => player.username),
  );
  const isHostedBot = players.map((player) => hostedBotNames.has(player.name));
  const hostedBotCount = isHostedBot.filter(Boolean).length;
  let hostedBotIndex = 0;

  return players.map((player, index) => {
    const name = stripUsernameTag(player.name);
    if (!isHostedBot[index]) return name;
    hostedBotIndex += 1;
    return hostedBotCount > 1 ? `Bot ${hostedBotIndex}` : "Bot";
  });
}
