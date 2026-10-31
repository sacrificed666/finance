export const CUSTOM_GAME_ID = "custom";

export interface Game {
  id: string;
  name: string;
  appId?: number;
  iconHash?: string;
}

export const GAMES: Game[] = [
  { id: "cs2", name: "Counter-Strike 2", appId: 730, iconHash: "8dbc71957312bbd3baea65848b545be9eae2a355" },
  { id: "dota2", name: "Dota 2", appId: 570, iconHash: "0bbb630d63262dd66d2fdd0f7d37e8661a410075" },
  { id: "tf2", name: "Team Fortress 2", appId: 440, iconHash: "f568912870a4684f9ec76277a1a404dda6bab213" },
  { id: "rust", name: "Rust", appId: 252490, iconHash: "820be4782639f9c4b64fa3ca7e6c26a95ae4fd1c" },
  { id: "pubg", name: "PUBG: Battlegrounds", appId: 578080, iconHash: "609f27278aa70697c13bf99f32c5a0248c381f9d" },
];

const BY_ID = new Map(GAMES.map((g) => [g.id, g]));

const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";

// A game by its id
const gameInfo = (id: string | undefined) => (id ? BY_ID.get(id) : undefined);

// A game's logo: the bundled one, then Steam's, or a custom address
export const gameLogoSources = (id: string | undefined, customLogo?: string): string[] => {
  if (id === CUSTOM_GAME_ID) return customLogo?.startsWith("https://") ? [customLogo] : [];
  const game = gameInfo(id);
  if (!game) return [];
  if (game.appId) {
    const sources: string[] = [`/games/${game.id}.png`];
    if (game.iconHash) {
      sources.push(`${STEAM_CDN}/steamcommunity/public/images/apps/${game.appId}/${game.iconHash}.jpg`);
    }
    sources.push(`${STEAM_CDN}/steam/apps/${game.appId}/capsule_sm_120.jpg`);
    sources.push(`${STEAM_CDN}/steam/apps/${game.appId}/capsule_231x87.jpg`);
    return sources;
  }
  return [];
};

// A game's name, or the custom one typed for it
export const gameLabel = (id: string | undefined, customName?: string): string | undefined => {
  if (id === CUSTOM_GAME_ID) return customName?.trim() ? customName.trim() : undefined;
  return gameInfo(id)?.name;
};
