import { test as base } from "@playwright/test";

import { expect, inTurn, openPage, ROUTES, saved, signUp, test, watchProblems } from "./helpers";

test("runs every page without console errors or policy violations", async ({ page }) => {
  const check = await watchProblems(page);
  await inTurn(ROUTES, (route) => openPage(page, route));
  await openPage(page, "/transactions?add=expense");
  const sheet = page.getByRole("dialog", { name: "New transaction" });
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder("Pages, accounts, entries, amounts…")).toBeVisible();
  await check();
});

base("runs the sign-in pages without console errors or policy violations", async ({ page }) => {
  const check = await watchProblems(page);
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/register");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await check();
});

base("sends a fresh nonce-based policy and the security headers", async ({ request }) => {
  const first = await request.get("/login");
  const second = await request.get("/login");
  const headers = first.headers();
  const policy = headers["content-security-policy"] ?? "";
  expect(policy).toMatch(/script-src 'self' 'nonce-[\w+/=]+' 'strict-dynamic'/u);
  expect(policy).not.toBe(second.headers()["content-security-policy"]);
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).not.toContain("unsafe-eval");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("same-origin");
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-powered-by"]).toBeUndefined();
});

base("keeps every account's data to itself", async ({ browser }) => {
  const owner = await browser.newContext();
  const ownerPage = await owner.newPage();
  await signUp(owner);
  await openPage(ownerPage, "/transactions?add=expense");
  const sheet = ownerPage.getByRole("dialog", { name: "New transaction" });
  await sheet.getByPlaceholder("0", { exact: true }).fill("500");
  await sheet.getByRole("textbox", { name: "Note" }).fill("Private note");
  const saving = saved(ownerPage);
  await sheet.getByRole("button", { name: "Save" }).click();
  await saving;

  const stranger = await browser.newContext();
  await signUp(stranger);
  const state = await (await stranger.request.get("/api/state")).text();
  expect(state).not.toContain("Private note");
  await owner.close();
  await stranger.close();
});

base("turns visitors away from the account's data", async ({ request }) => {
  const paths = ["/api/state", "/api/profile", "/api/push", "/api/passkeys", "/api/monobank", "/api/errors"];
  const answers = await Promise.all(paths.map(async (path) => [path, (await request.get(path)).status()]));
  expect(answers).toEqual(paths.map((path) => [path, 401]));
  const save = await request.patch("/api/state", { data: { changes: {} } });
  expect(save.status()).toBe(401);
  expect((await request.post("/api/push/remind")).status()).toBe(404);
});

base("answers health checks and names a security contact that has not expired", async ({ request }) => {
  expect((await (await request.get("/healthz")).text()).trim()).toBe("ok");
  const text = await (await request.get("/.well-known/security.txt")).text();
  expect(text).toMatch(/^Contact: https:\/\/github\.com\/sacrificed666\/finance\/security\/advisories\/new$/mu);
  const expires = Date.parse(/^Expires: (?<date>.+)$/mu.exec(text)?.groups?.date ?? "");
  expect(expires).toBeGreaterThan(Date.now());
});

base("serves flags that cannot run scripts", async ({ request }) => {
  const flag = await request.get("/flags/UA");
  expect(flag.headers()["content-type"]).toContain("image/svg+xml");
  expect(flag.headers()["content-security-policy"]).toContain("sandbox");
});
