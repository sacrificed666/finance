import { expect, ROUTES, test } from "./helpers";
import { VISUAL_NOW, visualState } from "./visual-state";

// Money: with a currency sign, shortened, or in thousands but not XP or a share
const AMOUNT =
  /[₴$€]\s?[−-]?\d|\d\s?₴|\d(?:[.,]\d)?\s?[KM](?![a-zA-Z])|\d{1,3}(?:[,   ]\d{3})+(?![\d%-]|(?:[.,]\d+)?\s?(?:%|XP))/u;

// The state comes from a route, which a service worker would pass by in WebKit
test.use({ serviceWorkers: "block" });

for (const path of ROUTES) {
  test(`shows no amount on ${path} while amounts are hidden`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("finance:view:hiddenAmounts", "true"));
    await page.clock.setFixedTime(new Date(VISUAL_NOW));
    await page.route("**/api/state", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ headers: { ETag: '"visual"', "X-Account": "visual" }, json: visualState("dark") })
        : route.fulfill({ json: { revision: "visual", stale: false, written: 0 } }),
    );
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-entered"), null, { timeout: 30_000 });
    // Every text, label and tooltip the page holds, the hidden tables of charts too
    const texts = await page.evaluate(() =>
      [...document.body.querySelectorAll("*")]
        .flatMap((element) =>
          element.closest("script, style, [data-public]")
            ? []
            : [
                [...element.childNodes]
                  .filter((node) => node.nodeType === Node.TEXT_NODE)
                  .map((node) => node.textContent)
                  .join(""),
                element.getAttribute("aria-label") ?? "",
                element.getAttribute("title") ?? "",
              ],
        )
        .map((text) => text.trim())
        .filter(Boolean),
    );
    expect(texts.filter((text) => AMOUNT.test(text))).toEqual([]);
  });
}
