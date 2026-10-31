import type { ThemePref } from "@/features/data/model/types";

// The cookie that tells the server the theme before the account's data arrives
export const THEME_COOKIE = "finance-theme";

// The theme of a first visit, before anything is chosen: the device's own
export const DEFAULT_THEME: ThemePref = "system";

const THEMES: readonly ThemePref[] = ["system", "light", "dark"];

// Whether a value is a theme the app knows
export const isThemePref = (value: unknown): value is ThemePref =>
  typeof value === "string" && (THEMES as readonly string[]).includes(value);

// A cookie the browser keeps for a year on every page
export const yearCookie = (name: string, value: string): string =>
  `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
