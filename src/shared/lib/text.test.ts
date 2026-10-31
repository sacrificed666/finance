import { describe, expect, it } from "vitest";

import { initials } from "./text";

describe("initials", () => {
  it.each([
    ["Monobank", "MO"],
    ["Raiffeisen Bank", "RB"],
    ["  wise  ", "WI"],
    ["A-Bank Ukraine", "AB"],
    ["!!!", "?"],
    ["", "?"],
  ])("makes %j into %j", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
