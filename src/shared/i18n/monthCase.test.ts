import { describe, expect, it } from "vitest";

import { genitiveMonths, shapeValue } from "./monthCase";
import { makeI18n } from "./translate";

describe("genitiveMonths", () => {
  it("turns month names into the genitive where a language has one", () => {
    expect(genitiveMonths("жовтень 2026 р.", "uk-UA")).toBe("жовтня 2026 р.");
    expect(genitiveMonths("Листопад 2026", "uk-UA")).toBe("Листопада 2026");
    expect(genitiveMonths("červenec 2026", "cs-CZ")).toBe("července 2026");
    expect(genitiveMonths("červen 2026", "cs-CZ")).toBe("června 2026");
    expect(genitiveMonths("październik 2026", "pl-PL")).toBe("października 2026");
    expect(genitiveMonths("October 2026", "en-GB")).toBe("October 2026");
  });
});

describe("placeholder shapes", () => {
  it("fills a month in the genitive or with a capital, as the text asks", () => {
    const i18n = makeI18n("uk", { "a.from": "з {month|gen}", "a.start": "{month|cap} на сьогодні" });
    expect(i18n.tk("a.from", "", { month: "березень 2027 р." })).toBe("з березня 2027 р.");
    expect(i18n.tk("a.start", "", { month: "березень" })).toBe("Березень на сьогодні");
    expect(shapeValue("text", "unknown", "en-GB")).toBe("text");
  });
});
