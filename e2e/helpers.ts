import { randomInt, randomUUID } from "node:crypto";

import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";

export const PASSWORD = "Long-enough-pass-42";

// Every page behind the sign-in
export const ROUTES = [
  "/",
  "/calendar",
  "/reports",
  "/transactions",
  "/income",
  "/accounts",
  "/investments",
  "/forecast",
  "/profile",
  "/settings",
];

// Outside services a test never reaches
const EXTERNAL = /coingecko|monobank\.ua|bank\.gov\.ua|inzhur\.reit|google/u;

// What Safari logs for a request that a navigation cancelled
const SAFARI_LOAD_FAILED = "TypeError: Load failed";

// Safari blames a cancelled request to the app itself on access control
const isCancelledFetch = (problem: string, host: string) =>
  problem.endsWith(" due to access control checks.") && problem.includes(`/${host}/`);

// A made-up address, so the sign-up limit counts each test apart
export const someAddress = () => `10.${String(randomInt(256))}.${String(randomInt(256))}.${String(randomInt(1, 255))}`;

// A new email that no other test uses
export const newEmail = () => `e2e-${randomUUID()}@example.com`;

// Creates an account through the API and signs the browser in with it
export const signUp = async (context: BrowserContext, email = newEmail(), name = "E2E") => {
  const created = await context.request.post("/api/auth/register", {
    data: { email, password: PASSWORD, name },
    headers: { "x-forwarded-for": someAddress() },
  });
  expect(created.status()).toBe(201);
  const csrf: unknown = await (await context.request.get("/api/auth/csrf")).json();
  const csrfToken = typeof csrf === "object" && csrf !== null && "csrfToken" in csrf ? String(csrf.csrfToken) : "";
  await context.request.post("/api/auth/callback/credentials", {
    form: { email, password: PASSWORD, csrfToken, callbackUrl: "/" },
    headers: { "x-forwarded-for": someAddress() },
  });
  const cookies = await context.cookies();
  expect(cookies.some((cookie) => cookie.name.endsWith("authjs.session-token"))).toBe(true);
  return email;
};

// Answers the app's own calls to outside services with steady figures
const stubOutsideServices = async (context: BrowserContext) => {
  await context.route(EXTERNAL, (route) => route.abort());
  await context.route("**/api/nbu-rate**", (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has("month") ? { USD: 41.2, EUR: 48.1 } : { rate: 41.2 },
    }),
  );
  await context.route("**/api/inzhur**", (route) =>
    route.fulfill({ json: { quotes: [], fetchedAt: new Date(0).toISOString(), partial: true } }),
  );
};

// Tests that run signed in to an account of their own
export const test = base.extend<{ email: string }>({
  email: [
    async ({ context, browserName }, provide) => {
      // Playwright's WebKit restarts the page when it reads push subscriptions
      if (browserName === "webkit") await context.addInitScript(() => Reflect.deleteProperty(window, "PushManager"));
      await stubOutsideServices(context);
      await provide(await signUp(context));
    },
    { auto: true },
  ],
});

// Runs the steps one after another, as a person would
export const inTurn = async <T>(items: readonly T[], step: (item: T) => Promise<unknown>): Promise<void> => {
  await items.reduce<Promise<unknown>>((previous, item) => previous.then(() => step(item)), Promise.resolve());
};

// Opens a page and waits until the account's data is shown
export const openPage = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
};

// Waits until the latest change reached the server
export const saved = (page: Page) =>
  page.waitForResponse(
    (response) => response.url().endsWith("/api/state") && response.request().method() === "PATCH" && response.ok(),
  );

// Collects console errors and CSP violations, then checks there are none
export const watchProblems = async (page: Page) => {
  const problems: string[] = [];
  let cancelled = 0;
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  // Safari logs a prefetch that a navigation cancels as a failed load
  page.on("requestfailed", (request) => {
    if (/cancel/iu.test(request.failure()?.errorText ?? "")) cancelled += 1;
  });
  await page.addInitScript(() => {
    const violations: string[] = [];
    Reflect.set(window, "policyViolations", violations);
    document.addEventListener("securitypolicyviolation", (event) => {
      violations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return async () => {
    const { host } = new URL(page.url());
    const real = problems.filter(
      (problem) =>
        problem !== SAFARI_LOAD_FAILED && !isCancelledFetch(problem, host) && !/Failed to load resource/u.test(problem),
    );
    expect(real).toEqual([]);
    expect(problems.filter((problem) => problem === SAFARI_LOAD_FAILED).length).toBeLessThanOrEqual(cancelled);
    expect(await page.evaluate(() => Reflect.get(window, "policyViolations"))).toEqual([]);
  };
};

// Texts cut off by their own box, skipping transparent and hidden ones
export const clippedText = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((element) => {
        if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
        const box = element.getBoundingClientRect();
        if (box.width < 2 || box.height < 2) return false;
        const style = getComputedStyle(element);
        if (!["hidden", "clip"].includes(style.overflowX) && style.textOverflow !== "ellipsis") return false;
        const text = [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        );
        return text && element.scrollWidth > element.clientWidth;
      })
      .map((element) => element.textContent.trim()),
  );

export { expect };
