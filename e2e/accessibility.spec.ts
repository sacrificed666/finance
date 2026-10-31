import { AxeBuilder } from "@axe-core/playwright";
import { test as base, type Page } from "@playwright/test";

import { clippedText, expect, inTurn, openPage, ROUTES, saved, test } from "./helpers";

base.use({ reducedMotion: "reduce" });

// Axe violations of the page, as rule ids and targets
const violations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .options({ rules: { "label-content-name-mismatch": { enabled: true }, "target-size": { enabled: true } } })
    .analyze();
  return results.violations.map((violation) => ({
    rule: violation.id,
    targets: violation.nodes.map((node) => node.target.join(" ")),
  }));
};

// Picks the language of the account in the settings
const chooseLanguage = async (page: Page, language: RegExp) => {
  await openPage(page, "/settings");
  const saving = saved(page);
  await page
    .getByRole("main")
    .getByRole("button", { name: /^Language: / })
    .click();
  await page.getByRole("option", { name: language }).click();
  await saving;
};

for (const route of ROUTES) {
  test(`has no detectable accessibility issues on ${route}`, async ({ page }) => {
    await openPage(page, route);
    expect(await violations(page)).toEqual([]);
  });
}

for (const path of ["/login", "/register"]) {
  base(`has no detectable accessibility issues on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
}

test.describe("in the dark appearance", () => {
  test.use({ colorScheme: "dark" });

  for (const route of ["/", "/transactions", "/settings"]) {
    test(`keeps ${route} accessible`, async ({ page }) => {
      await openPage(page, route);
      expect(await violations(page)).toEqual([]);
    });
  }
});

test.describe("in both appearances", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`keeps the glass readable in the ${colorScheme} appearance`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await openPage(page, "/");
      expect(await violations(page)).toEqual([]);
    });
  }
});

test("keeps the entry sheet and the command palette accessible", async ({ page }) => {
  await openPage(page, "/transactions?add=expense");
  await expect(page.getByRole("dialog", { name: "New transaction" })).toBeVisible();
  expect(await violations(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("re");
  await expect(page.getByRole("option").first()).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test("can be used with the keyboard alone", async ({ page, browserName }) => {
  await openPage(page, "/reports");
  // Safari moves focus to links with Option+Tab
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

for (const route of ROUTES) {
  test(`reflows at 320 pixels without scrolling sideways on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await openPage(page, route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

for (const [language, heading] of [
  [/Українська/u, "Налаштування"],
  [/Français/u, "Paramètres"],
  [/Português/u, "Definições"],
] as const) {
  test(`shows every word whole at 360 pixels in ${heading}`, async ({ page }) => {
    await chooseLanguage(page, language);
    await page.setViewportSize({ width: 360, height: 780 });
    await inTurn(["/", "/transactions", "/settings"], async (route) => {
      await openPage(page, route);
      expect(await clippedText(page), route).toEqual([]);
    });
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  });
}

test.describe("in forced colours mode", () => {
  test.use({ forcedColors: "active" });

  test("keeps the chosen option apart from the others", async ({ page }) => {
    await openPage(page, "/settings");
    const theme = page.getByRole("group", { name: "Theme" });
    const chosen = theme.locator("label").filter({ has: page.getByRole("radio", { name: "Auto" }) });
    const other = theme.locator("label").filter({ has: page.getByRole("radio", { name: "Dark" }) });
    // Background, outline and border of an element
    const style = (element: typeof chosen) =>
      element.evaluate((node) => {
        const computed = getComputedStyle(node);
        return `${computed.backgroundColor} ${computed.outlineStyle} ${computed.borderStyle}`;
      });
    expect(await style(chosen)).not.toBe(await style(other));
  });
});
