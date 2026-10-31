import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);
// WebKit service workers skip page.route, so they stay off to keep stubs
const WEBKIT = { serviceWorkers: "block" as const };
// Screenshots are compared on the Linux runners of CI only, see docs/testing.md
const VISUAL = CI || Boolean(process.env.VISUAL);
const SCREENSHOTS = "e2e/__screenshots__";
const PORT = 3100;
const DB_PORT = 4030;
const BASE_URL = `http://localhost:${PORT}`;
// Keys of the throwaway server only, never of a real one
const AUTH_SECRET = "e2e-auth-secret-for-the-throwaway-test-server";
const DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  snapshotPathTemplate: `${SCREENSHOTS}/{testFilePath}/{arg}{ext}`,
  // Until the first screenshots are committed, the visual tests only load the pages
  ignoreSnapshots: !existsSync(SCREENSHOTS),
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: BASE_URL,
    locale: "en-GB",
    timezoneId: "Europe/Kyiv",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", testIgnore: /lighthouse|visual/, use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testIgnore: /lighthouse|visual/, use: { ...devices["Pixel 7"] } },
    { name: "webkit", testIgnore: /lighthouse|visual/, use: { ...devices["Desktop Safari"], ...WEBKIT } },
    ...(VISUAL ? [{ name: "visual", testMatch: /visual\.spec\.ts/, use: { ...devices["Desktop Chrome"] } }] : []),
    {
      name: "lighthouse",
      testMatch: /lighthouse\.spec\.ts/,
      dependencies: ["desktop", "mobile", ...(VISUAL ? ["visual"] : [])],
    },
  ],
  webServer: [
    {
      command: "node e2e/postgres.ts",
      port: DB_PORT,
      env: { E2E_DB_PORT: String(DB_PORT) },
      reuseExistingServer: !CI,
    },
    {
      command: `npm run build && npm run start -- --port ${PORT}`,
      url: `${BASE_URL}/login`,
      env: {
        DATABASE_URL: `postgresql://postgres@127.0.0.1:${DB_PORT}/postgres`,
        // PGlite is one session, so queries from parallel connections would mix
        DATABASE_POOL_MAX: "1",
        AUTH_SECRET,
        DATA_ENCRYPTION_KEY,
        AUTH_URL: BASE_URL,
        AUTH_TRUST_HOST: "true",
        OWNER_EMAIL: "",
        REMINDERS: "off",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      timeout: 300_000,
      reuseExistingServer: !CI,
    },
  ],
});
