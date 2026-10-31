import { describe, expect, it } from "vitest";

import { cachedMessages, loadMessages, rememberMessages } from "./catalog";
import { LOCALES } from "./locales";
import { serverMessages } from "./server";

describe("catalog", () => {
  it("loads every language once and keeps it", async () => {
    const all = await Promise.all(LOCALES.map((locale) => loadMessages(locale)));
    for (const [index, locale] of LOCALES.entries()) {
      expect(all[index]).toBe(serverMessages(locale));
      expect(cachedMessages(locale)).toBe(all[index]);
    }
    await expect(loadMessages("uk")).resolves.toBe(all[LOCALES.indexOf("uk")]);
  });

  it("keeps the messages the server sent along", () => {
    const messages = { "app.name": "Finance" };
    rememberMessages("de", messages);
    expect(cachedMessages("de")).toBe(messages);
  });
});
