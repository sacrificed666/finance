import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { type BrowserContext, chromium, expect, test } from "@playwright/test";
import lighthouse from "lighthouse";
import { userAgents } from "lighthouse/core/config/constants.js";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

import { signUp } from "./helpers";

const PORT = 9334;

const BUDGETS = [
  { path: "/login", signedIn: false, desktop: true, performance: 0.9, kilobytes: 410 },
  { path: "/login", signedIn: false, desktop: false, performance: 0.8, kilobytes: 410 },
  { path: "/", signedIn: true, desktop: true, performance: 0.9, kilobytes: 490 },
  { path: "/transactions", signedIn: true, desktop: false, performance: 0.8, kilobytes: 500 },
];

// Marks the account's rates fresh, so the audit never waits on Monobank's limit
const freshRates = async (context: BrowserContext) => {
  const loaded = await context.request.get("/api/state");
  const state: unknown = await loaded.json();
  const settings = typeof state === "object" && state !== null && "settings" in state ? state.settings : null;
  if (typeof settings !== "object" || settings === null) throw new Error("The account has no settings");
  const saved = await context.request.patch("/api/state", {
    data: {
      base: (loaded.headers().etag ?? "").replaceAll('"', ""),
      changes: { settings: { ...settings, ratesUpdatedAt: new Date().toISOString() } },
    },
  });
  expect(saved.ok()).toBe(true);
};

test.describe.configure({ mode: "serial" });

for (const budget of BUDGETS) {
  test(`stays within budget on ${budget.path} (${budget.desktop ? "desktop" : "mobile"})`, async ({
    baseURL,
  }, testInfo) => {
    test.setTimeout(180_000);
    // A browser of its own, whose profile Lighthouse drives, signed in when needed
    const profile = await mkdtemp(path.join(tmpdir(), "finance-lighthouse-"));
    const browser = await chromium.launchPersistentContext(profile, {
      baseURL,
      args: [`--remote-debugging-port=${String(PORT)}`],
    });
    try {
      if (budget.signedIn) {
        await signUp(browser);
        await freshRates(browser);
      }
      const result = await lighthouse(
        `${baseURL ?? ""}${budget.path}`,
        {
          port: PORT,
          output: "html",
          logLevel: "error",
          // Next.js puts metadata in the head, not the stream, for this token
          emulatedUserAgent: `${budget.desktop ? userAgents.desktop : userAgents.mobile} Chrome-Lighthouse`,
        },
        budget.desktop ? desktopConfig : undefined,
      );
      const report = result?.lhr;
      if (typeof result?.report === "string") {
        await testInfo.attach("lighthouse-report.html", { body: result.report, contentType: "text/html" });
      }
      expect(report?.runtimeError).toBeUndefined();
      // The score of a Lighthouse category, or 0
      const score = (category: string) => report?.categories[category]?.score ?? 0;
      // The failed audits of a category, the weighted ones unless asked
      const failing = (category: string, includeUnweighted = false) =>
        (report?.categories[category]?.auditRefs ?? [])
          .filter((ref) => (includeUnweighted || ref.weight > 0) && report?.audits[ref.id]?.score === 0)
          .map((ref) => ref.id);
      expect.soft(score("performance"), "performance").toBeGreaterThanOrEqual(budget.performance);
      expect.soft(score("accessibility"), "accessibility").toBe(1);
      expect.soft(failing("accessibility", true), "accessibility audits").toEqual([]);
      expect.soft(score("best-practices"), "best practices").toBe(1);
      expect.soft(failing("best-practices"), "best practices audits").toEqual([]);
      expect
        .soft(report?.audits["total-byte-weight"]?.numericValue ?? Infinity, "total bytes")
        .toBeLessThanOrEqual(budget.kilobytes * 1024);
    } finally {
      await browser.close();
      await rm(profile, { recursive: true, force: true });
    }
  });
}
