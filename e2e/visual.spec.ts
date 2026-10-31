import type { Page } from "@playwright/test";

import { expect, test } from "./helpers";
import { VISUAL_NOW, visualState } from "./visual-state";

const SCREENS = [
  { path: "/", name: "overview", themes: ["dark", "light"] },
  { path: "/transactions", name: "expenses", themes: ["dark", "light"] },
  { path: "/reports", name: "reports", themes: ["dark"] },
  { path: "/accounts", name: "accounts", themes: ["dark"] },
  { path: "/forecast", name: "forecast", themes: ["dark"] },
  { path: "/settings", name: "settings", themes: ["dark"] },
] as const;

// The state comes from a route, which a service worker would pass by in WebKit
test.use({ locale: "en-GB", timezoneId: "Europe/Kyiv", serviceWorkers: "block" });

// Shows a page with the same six months of data at the same moment
const showPage = async (page: Page, path: string, theme: "dark" | "light") => {
  await page.clock.setFixedTime(new Date(VISUAL_NOW));
  await page.route("**/api/state", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ headers: { ETag: '"visual"', "X-Account": "visual" }, json: visualState(theme) })
      : route.fulfill({ json: { revision: "visual", stale: false, written: 0 } }),
  );
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main h1")).toBeVisible();
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-entered"), null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
};

for (const screen of SCREENS) {
  for (const theme of screen.themes) {
    test(`${screen.name} in the ${theme} theme`, async ({ page }) => {
      await showPage(page, screen.path, theme);
      await expect(page).toHaveScreenshot(`${screen.name}-${theme}.png`, { animations: "disabled" });
    });
  }

  test(`${screen.name} on a phone`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await showPage(page, screen.path, "dark");
    await expect(page).toHaveScreenshot(`${screen.name}-phone.png`, { animations: "disabled" });
  });
}

test("the sign-in page", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("sign-in.png", { animations: "disabled" });
});
