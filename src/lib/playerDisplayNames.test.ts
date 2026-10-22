import { describe, expect, it } from "vitest";
import { displayPlayerNames } from "@/lib/playerDisplayNames";

describe("displayPlayerNames", () => {
  it("shortens self-hosted bot usernames without changing their protocol identities", () => {
    const players = [{ name: "Alice@1234" }, { name: "self-hosted-node-abc-bot@5678" }];
    const roomPlayers = [
      { username: "Alice@1234", is_bot: false },
      { username: "self-hosted-node-abc-bot@5678", is_bot: true },
    ];

    expect(displayPlayerNames(players, roomPlayers)).toEqual(["Alice", "Bot"]);
    expect(players[1]?.name).toBe("self-hosted-node-abc-bot@5678");
  });

  it("keeps an observer node and human usernames with the same prefix unchanged", () => {
    const players = [{ name: "self-hosted-node-observer" }, { name: "self-hosted-node-human" }];
    const roomPlayers = [
      { username: "self-hosted-node-observer", is_bot: false },
      { username: "self-hosted-node-human", is_bot: false },
    ];

    expect(displayPlayerNames(players, roomPlayers)).toEqual([
      "self-hosted-node-observer",
      "self-hosted-node-human",
    ]);
  });

  it("matches the exact room identity when username tags distinguish similar names", () => {
    const players = [
      { name: "self-hosted-node-abc-bot@1234" },
      { name: "self-hosted-node-abc-bot@5678" },
    ];
    const roomPlayers = [
      { username: "self-hosted-node-abc-bot@1234", is_bot: true },
      { username: "self-hosted-node-abc-bot@5678", is_bot: false },
    ];

    expect(displayPlayerNames(players, roomPlayers)).toEqual(["Bot", "self-hosted-node-abc-bot"]);
  });

  it("numbers multiple self-hosted bots so each remains distinguishable", () => {
    const players = [{ name: "self-hosted-node-a-bot" }, { name: "self-hosted-node-b-bot" }];
    const roomPlayers = [
      { username: "self-hosted-node-a-bot", is_bot: true },
      { username: "self-hosted-node-b-bot", is_bot: true },
    ];

    expect(displayPlayerNames(players, roomPlayers)).toEqual(["Bot 1", "Bot 2"]);
  });

  it("leaves other bot usernames intact", () => {
    expect(
      displayPlayerNames([{ name: "Forge AI" }], [{ username: "Forge AI", is_bot: true }]),
    ).toEqual(["Forge AI"]);
  });
});
