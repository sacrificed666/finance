import { test as base } from "@playwright/test";

import { expect, openPage, saved, test } from "./helpers";

base.describe("with a Ukrainian browser", () => {
  base.use({ locale: "uk-UA" });

  base("greets a visitor in Ukrainian", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await expect(page.getByRole("heading", { level: 1, name: "Фінанси" })).toBeVisible();
    await expect(page.getByText("Увійдіть до своїх даних.")).toBeVisible();
    await expect(page).toHaveTitle("Увійти · Фінанси");
  });
});

base.describe("with a Czech browser", () => {
  base.use({ locale: "cs-CZ" });

  base("greets a visitor in Czech", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "cs");
    await expect(page.getByText("Přihlaste se ke svým datům.")).toBeVisible();
  });
});

base("lets a visitor pick the language and remembers it", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Language: English" }).click();
  await page.getByRole("option", { name: /Deutsch/u }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByText("Melde dich bei deinen Daten an.")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
});

test("keeps the language of the account on every device", async ({ page, context }) => {
  await openPage(page, "/settings");
  const saving = saved(page);
  await page.getByRole("main").getByRole("button", { name: "Language: English" }).click();
  await page.getByRole("option", { name: /Polski/u }).click();
  await saving;
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  await expect(page.getByRole("heading", { level: 1, name: "Ustawienia" })).toBeVisible();
  await context.clearCookies({ name: "finance-locale" });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Ustawienia" })).toBeVisible();
});
