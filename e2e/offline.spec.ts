import { expect, openPage, test } from "./helpers";

// The offline page comes from the service worker, which WebKit blocks elsewhere
test.use({ serviceWorkers: "allow" });

test("shows its own page when a reload fails offline and returns once online", async ({ page, context }) => {
  await openPage(page, "/settings");
  await page.getByRole("main").getByRole("button", { name: "Language: English" }).click();
  await page.getByRole("option", { name: /Українська/u }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  // The worker keeps the offline page in the language of the account
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("/offline/uk")))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  const offline = page.getByRole("heading", { level: 1, name: "Немає з’єднання" });
  await expect(offline).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("heading", { level: 1, name: "Налаштування" })).toBeVisible({ timeout: 15_000 });
});

test("serves the offline page in every language", async ({ request }) => {
  const english = await request.get("/offline/en");
  expect(english.headers()["content-type"]).toContain("text/html");
  expect(await english.text()).toContain("No connection");
  expect((await request.get("/offline/xx")).status()).toBe(404);
});
