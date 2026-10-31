// Operating systems by a telltale part of the user agent
const SYSTEMS: Array<[RegExp, string]> = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/CrOS/, "ChromeOS"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

// Browsers by their token, the ones that copy others first
const BROWSERS: Array<[RegExp, string]> = [
  [/Edg(A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

// A device as "Browser · System" from its user agent, or what is known of it
export const deviceLabel = (userAgent: string | null | undefined): string => {
  const ua = userAgent ?? "";
  const system = SYSTEMS.find(([re]) => re.test(ua))?.[1];
  const browser = BROWSERS.find(([re]) => re.test(ua))?.[1];
  if (browser && system) return `${browser} · ${system}`;
  return browser ?? system ?? "";
};

// How many proxies in front of the app add to X-Forwarded-For, one by default
const proxyHops = (): number => {
  const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  return Number.isInteger(hops) && hops >= 1 ? hops : 1;
};

// The visitor's address as the nearest trusted proxy saw it, or the real IP
export const clientAddress = (forwarded: string | null | undefined, real: string | null | undefined): string => {
  const chain = (forwarded ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  return chain.at(-Math.min(proxyHops(), chain.length)) ?? real?.trim() ?? "";
};
