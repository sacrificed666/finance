import { describe, expect, it } from "vitest";

import { passwordStrength, STRENGTH_COLOR } from "./passwordMeter";

describe("passwordStrength", () => {
  it.each([
    ["", 0, "weak"],
    ["abcdefghij", 1, "weak"],
    ["abcdefghi1", 2, "fair"],
    ["abcdefgh1!", 3, "good"],
    ["abcdefgh1!abcdefgh", 4, "strong"],
  ] as const)("rates %j as %s", (password, score, level) => {
    const strength = passwordStrength(password);
    expect(strength.score).toBe(score);
    expect(strength.level).toBe(level);
  });

  it("names the rules a password still misses", () => {
    expect(passwordStrength("пароль1").rules).toEqual({ length: false, mix: true, symbol: false });
    expect(STRENGTH_COLOR.strong).toBe("var(--color-income)");
  });
});
