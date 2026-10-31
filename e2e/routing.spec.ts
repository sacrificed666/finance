import { readFileSync } from "node:fs";

import { test as base } from "@playwright/test";

import { expect, openPage, ROUTES, test } from "./helpers";

// Every translation key, to spot one shown untranslated
const KEYS = new Set(
  [...readFileSync("src/shared/i18n/messages/en.ts", "utf8").matchAll(/^\s*"([\w.]+)":/gmu)].map((match) =>
    (match[1] ?? "").replace(/\.(?:one|other)$/u, ""),
  ),
);

// Blocks that scroll by no more than this are a layout slip, not content
const STRAY_PX = 12;

for (const route of ROUTES) {
  test(`renders ${route} with every text translated and no stray scrollbars`, async ({ page }) => {
    await openPage(page, route);
    const text = await page.locator("body").innerText();
    const raw = [...text.matchAll(/\b[a-z][a-zA-Z\d]*(?:\.[a-zA-Z\d]+)+\b/gu)]
      .map((match) => match[0])
      .filter((word) => KEYS.has(word));
    expect(raw, "untranslated keys").toEqual([]);
    const stray = await page.evaluate((limit) => {
      const found: string[] = [];
      for (const element of document.querySelectorAll("main *")) {
        const style = getComputedStyle(element);
        const down = /auto|scroll/u.test(style.overflowY) ? element.scrollHeight - element.clientHeight : 0;
        const across = /auto|scroll/u.test(style.overflowX) ? element.scrollWidth - element.clientWidth : 0;
        if ((down > 1 && down <= limit) || (across > 1 && across <= limit)) found.push(element.className);
      }
      return found;
    }, STRAY_PX);
    expect(stray, "blocks that scroll by a few pixels only").toEqual([]);
  });
}

test("sends a signed-in visitor from the sign-in page to the dashboard", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/u);
  await expect(page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)/u })).toBeVisible();
});

test("answers an address the app does not have with its own page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "There is no such page" })).toBeVisible();
  await page.getByRole("link", { name: "Go to the overview" }).click();
  await expect(page).toHaveURL(/\/$/u);
});

test("moves the old balance page to the accounts", async ({ page }) => {
  await page.goto("/balance");
  await expect(page).toHaveURL(/\/accounts$/u);
});

base("sends a visitor from every page to sign in first", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login\?next=%2Ftransactions$/u);
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
});

test("opens an entry from the address and closes it", async ({ page }) => {
  await openPage(page, "/transactions?add=expense");
  const sheet = page.getByRole("dialog", { name: "New transaction" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Cancel" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/transactions$/u);
});
