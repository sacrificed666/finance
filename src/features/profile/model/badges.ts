import type { HealthGrade, HealthPartId, Tier } from "./achievements";

// The tiers from the easiest to the hardest
export const TIERS: readonly Tier[] = ["bronze", "silver", "gold", "platinum"];

// The colour of each tier's medal
export const TIER_COLOR: Record<Tier, string> = {
  bronze: "#c07a3e",
  silver: "#a8b0b8",
  gold: "#e0b43a",
  platinum: "#7fd4e6",
};

// The colour of each health grade
export const HEALTH_TONE: Record<HealthGrade, string> = {
  excellent: "var(--color-income)",
  good: "var(--color-income)",
  fair: "var(--color-warning)",
  weak: "var(--color-expense)",
};

// The page where each part of the health score can be improved
export const HEALTH_LINK: Record<HealthPartId, string> = {
  savings: "/transactions",
  cushion: "/accounts",
  debt: "/accounts",
  budgets: "/transactions",
  stability: "/transactions",
  diversity: "/investments",
  investing: "/investments",
};
