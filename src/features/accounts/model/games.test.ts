import { describe, expect, it } from "vitest";

import { CUSTOM_GAME_ID, gameLabel, gameLogoSources, GAMES } from "./games";

// An account that has no game picked yet
const NO_GAME = GAMES.find((game) => game.id === "none")?.id;

describe("games", () => {
  it("lists the bundled logo before Steam's", () => {
    expect(gameLogoSources("cs2")).toEqual([
      "/games/cs2.png",
      "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/730/8dbc71957312bbd3baea65848b545be9eae2a355.jpg",
      "https://cdn.cloudflare.steamstatic.com/steam/apps/730/capsule_sm_120.jpg",
      "https://cdn.cloudflare.steamstatic.com/steam/apps/730/capsule_231x87.jpg",
    ]);
    expect(GAMES.every((game) => gameLogoSources(game.id).length === 4)).toBe(true);
  });

  it("takes only a secure custom logo", () => {
    expect(gameLogoSources(CUSTOM_GAME_ID, "https://example.com/logo.png")).toEqual(["https://example.com/logo.png"]);
    expect(gameLogoSources(CUSTOM_GAME_ID, "http://example.com/logo.png")).toEqual([]);
    expect(gameLogoSources(CUSTOM_GAME_ID)).toEqual([]);
    expect(gameLogoSources("unknown")).toEqual([]);
    expect(gameLogoSources(NO_GAME)).toEqual([]);
  });

  it("names a game or its custom name", () => {
    expect(gameLabel("dota2")).toBe("Dota 2");
    expect(gameLabel(CUSTOM_GAME_ID, "  Factorio ")).toBe("Factorio");
    expect(gameLabel(CUSTOM_GAME_ID, "  ")).toBeUndefined();
    expect(gameLabel(NO_GAME)).toBeUndefined();
  });
});
