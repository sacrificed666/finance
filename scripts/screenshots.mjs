// Takes the README pictures from a running app with the visual tests' data
import { randomInt, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import process from "node:process";

import { chromium } from "@playwright/test";

// Where the app runs, where the pictures go and how long a page settles
const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = new URL("../docs/images/", import.meta.url);
const SRC = new URL("../src/", import.meta.url);
const SETTLE = 1500;
const PASSWORD = "Long-enough-pass-42";
const DESKTOP = { viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
// Outside services the pictures never wait for
const EXTERNAL = /coingecko|monobank\.ua|bank\.gov\.ua|inzhur\.reit|google|duckduckgo|icon\.horse|steamstatic/u;

// The @/ alias of the app, so the data of the visual tests loads in Node.js
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
    const base = new URL(specifier.slice(2), SRC).href;
    const file = [".ts", ".tsx", "/index.ts"].map((ending) => new URL(base + ending)).find((url) => existsSync(url));
    return nextResolve(file?.href ?? base, context);
  },
});

const { VISUAL_NOW, visualState } = await import("../e2e/visual-state.ts");

// A made-up address, so the sign-up limit counts every picture apart
const someAddress = () => `10.${String(randomInt(256))}.${String(randomInt(256))}.${String(randomInt(1, 255))}`;

// Saves a picture next to the others
const save = (name, buffer) => writeFile(new URL(name, OUT), buffer);

// Signs a new, empty account in; the pictures show the visual tests' data instead
const signUp = async (context) => {
  const email = `screenshots-${randomUUID()}@example.com`;
  const headers = { "x-forwarded-for": someAddress() };
  const created = await context.request.post("/api/auth/register", { data: { email, password: PASSWORD }, headers });
  if (created.status() !== 201) throw new Error(`Could not sign up on ${BASE}: ${String(created.status())}`);
  const { csrfToken } = await (await context.request.get("/api/auth/csrf")).json();
  await context.request.post("/api/auth/callback/credentials", {
    form: { email, password: PASSWORD, csrfToken, callbackUrl: "/" },
    headers,
  });
};

// A settled page in a theme and language with six months of data
const open = async (browser, device, theme, path, locale = "en") => {
  const context = await browser.newContext({
    ...device,
    baseURL: BASE,
    locale: locale === "uk" ? "uk-UA" : "en-GB",
    timezoneId: "Europe/Kyiv",
    serviceWorkers: "block",
  });
  await context.clock.setFixedTime(new Date(VISUAL_NOW));
  await context.addCookies(
    [
      ["finance-theme", theme],
      ["finance-locale", locale],
    ].map(([name, value]) => ({ name, value, url: BASE })),
  );
  await context.route(EXTERNAL, (route) => route.abort());
  const state = visualState(theme);
  await context.route("**/api/state", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({
          headers: { ETag: '"visual"', "X-Account": "visual" },
          json: { ...state, settings: { ...state.settings, locale } },
        })
      : route.fulfill({ json: { revision: "visual", stale: false, written: 0 } }),
  );
  await context.route("**/api/nbu-rate**", (route) => route.fulfill({ json: { USD: 41.2, EUR: 48.1, rate: 41.2 } }));
  await context.route("**/api/inzhur**", (route) =>
    route.fulfill({ json: { quotes: [], fetchedAt: new Date(0).toISOString(), partial: true } }),
  );
  await signUp(context);
  const page = await context.newPage();
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.locator("main h1").waitFor();
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-entered"), null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(SETTLE);
  return page;
};

// Takes a picture of the window and closes it
const shoot = async (page, name) => {
  await save(name, await page.screenshot({ type: "jpeg", quality: 85, animations: "disabled" }));
  await page.context().close();
};

const SHOTS = [
  // The dashboard on a wide screen in both themes
  async (browser) => shoot(await open(browser, DESKTOP, "light", "/"), "desktop-light.jpg"),
  async (browser) => shoot(await open(browser, DESKTOP, "dark", "/"), "desktop-dark.jpg"),
  // Expenses with the ledger and the budgets
  async (browser) => shoot(await open(browser, DESKTOP, "dark", "/transactions"), "desktop-expenses.jpg"),
  // Phones: the dashboard in light, and Expenses in Ukrainian in dark
  async (browser) => shoot(await open(browser, PHONE, "light", "/"), "mobile-light.jpg"),
  async (browser) => shoot(await open(browser, PHONE, "dark", "/transactions", "uk"), "mobile-dark-uk.jpg"),
  // The command palette over the dashboard
  async (browser) => {
    const page = await open(browser, { ...DESKTOP, viewport: { width: 1200, height: 760 } }, "dark", "/");
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByRole("combobox", { name: "Search and commands" }).fill("Rent");
    await page.waitForTimeout(SETTLE);
    await shoot(page, "palette.jpg");
  },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  await SHOTS.reduce((previous, shot) => previous.then(() => shot(browser)), Promise.resolve());
  process.stdout.write(`Saved ${String(SHOTS.length)} pictures in docs/images.\n`);
} finally {
  await browser.close();
}
