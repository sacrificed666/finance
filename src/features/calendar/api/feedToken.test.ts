import { describe, expect, it } from "vitest";

import { feedPath, feedToken, tokenMatches } from "./feedToken";

describe("feedToken", () => {
  it("gives each account and link number its own token, which only that number matches", () => {
    const token = feedToken("secret", "u1", 1);
    expect(token).toMatch(/^[\w-]{32}$/u);
    expect(feedToken("secret", "u1", 2)).not.toBe(token);
    expect(feedToken("secret", "u2", 1)).not.toBe(token);
    expect(tokenMatches("secret", "u1", 1, token)).toBe(true);
    expect(tokenMatches("secret", "u1", 2, token)).toBe(false);
    expect(tokenMatches("other", "u1", 1, token)).toBe(false);
    expect(feedPath("secret", "u1", 1)).toBe(`/api/calendar/u1/1.${token}.ics`);
  });
});
