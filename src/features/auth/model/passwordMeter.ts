export type StrengthLevel = "weak" | "fair" | "good" | "strong";

export interface PasswordStrength {
  rules: { length: boolean; mix: boolean; symbol: boolean };
  score: number;
  level: StrengthLevel;
}

// The colour the meter takes at each level
export const STRENGTH_COLOR: Record<StrengthLevel, string> = {
  weak: "var(--color-expense)",
  fair: "var(--color-warning)",
  good: "var(--color-accent)",
  strong: "var(--color-income)",
};

// The level a score of zero to four reaches
const levelOf = (score: number): StrengthLevel => {
  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "good";
  return "strong";
};

// A password's strength: length 10, letters and digits, a symbol, a bonus at 16
export const passwordStrength = (password: string): PasswordStrength => {
  const rules = {
    length: password.length >= 10,
    mix: /\p{L}/u.test(password) && /\d/u.test(password),
    symbol: /[^\p{L}\p{N}]/u.test(password),
  };
  const score = Number(rules.length) + Number(rules.mix) + Number(rules.symbol) + Number(password.length >= 16);
  return { rules, score, level: levelOf(score) };
};
