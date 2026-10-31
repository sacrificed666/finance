import { test as base } from "@playwright/test";

import { expect, inTurn, openPage, test } from "./helpers";

base.skip(({ isMobile }) => isMobile, "The markup for robots and installs is the same on every screen");

base("keeps a private app out of every search engine", async ({ page, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/^Disallow: \/$/mu);
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page).toHaveTitle("Sign in · Finances");
});

test("names each page in the title", async ({ page }) => {
  const pages = [
    ["/", "Dashboard"],
    ["/transactions", "Expenses"],
    ["/reports", "Reports"],
    ["/settings", "Settings"],
  ] as const;
  await inTurn(pages, async ([path, title]) => {
    await openPage(page, path);
    await expect(page).toHaveTitle(`${title} · Finances`);
  });
});

base("describes the app for installation", async ({ request }) => {
  const manifest: unknown = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "Finances", start_url: "/", display: "standalone" });
  const icons = ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png", "/apple-icon.png"];
  const types = await Promise.all(icons.map(async (icon) => (await request.get(icon)).headers()["content-type"]));
  expect(types).toEqual(icons.map(() => "image/png"));
});

test("opens the shortcuts of the installed app", async ({ page }) => {
  await openPage(page, "/?add=expense");
  await expect(page.getByRole("dialog", { name: "New transaction" })).toBeVisible();
});
