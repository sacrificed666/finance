import { describe, expect, it } from "vitest";

import { isLocale, LOCALE_INFO, LOCALES, negotiateLocale } from "./locales";

describe("locales", () => {
  it("recognises supported locales", () => {
    expect(isLocale("uk")).toBe(true);
    expect(isLocale("ru")).toBe(false);
    expect(isLocale(42)).toBe(false);
  });

  it("describes every locale", () => {
    for (const locale of LOCALES) {
      expect(LOCALE_INFO[locale].intl.startsWith(locale)).toBe(true);
      expect(LOCALE_INFO[locale].flag).toMatch(/^[A-Z]{2}$/u);
      expect(LOCALE_INFO[locale].name).not.toBe("");
    }
  });

  it.each([
    [null, "en"],
    ["", "en"],
    ["uk-UA,uk;q=0.9,en;q=0.8", "uk"],
    ["ru-RU,ru;q=0.9,de;q=0.7,en;q=0.5", "de"],
    ["en;q=0.2, pl;q=0.9", "pl"],
    ["fr-CA;q=0, it", "it"],
    ["nl-BE", "nl"],
    ["ja, zh", "en"],
    ["*", "en"],
  ])("matches %j to %s", (header, locale) => {
    expect(negotiateLocale(header)).toBe(locale);
  });
});
