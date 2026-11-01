import { test as base, type Page } from "@playwright/test";

import { expect, newEmail, openPage, PASSWORD, signUp, someAddress, test } from "./helpers";

// Password checks are slow on purpose, the more so on a busy CI runner
const PASSWORD_CHECK = { timeout: 15_000 };

// Waits for the form to come alive, so what the test types reaches the page
const formReady = async (page: Page) => {
  await expect(page.locator('form button[type="submit"]')).toBeEnabled();
};

// Sign-ups from the page get an address of their own, as they would from a proxy
base.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": someAddress() });
});

base("creates an account on the sign-up page and lands on the dashboard", async ({ page }) => {
  await page.goto("/register");
  await formReady(page);
  await page.getByRole("textbox", { name: /^Name/u }).fill("Ann");
  await page.getByRole("textbox", { name: "Email" }).fill(newEmail());
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/u, PASSWORD_CHECK);
  await expect(page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)/u })).toBeVisible();
});

base("signs in with the password and refuses a wrong one", async ({ page, context }) => {
  const email = await signUp(context);
  await context.clearCookies();
  await page.goto("/login");
  await formReady(page);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("not the password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Wrong email or password.")).toBeVisible(PASSWORD_CHECK);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)/u })).toBeVisible(
    PASSWORD_CHECK,
  );
});

base("sends a visitor to sign in and back to the page asked for", async ({ page, context }) => {
  await page.goto("/reports");
  await expect(page).toHaveURL(/\/login\?next=%2Freports$/u);
  const email = await signUp(context);
  await context.clearCookies();
  await page.reload();
  await formReady(page);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/reports$/u, PASSWORD_CHECK);
});

base("refuses a second account with the same email", async ({ page, context }) => {
  const email = await signUp(context);
  await context.clearCookies();
  await page.goto("/register");
  await formReady(page);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("There is already an account with that email. Try signing in.")).toBeVisible(
    PASSWORD_CHECK,
  );
});

test("signs out to the sign-in page", async ({ page }) => {
  await openPage(page, "/profile");
  await page.getByRole("main").getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/u);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings$/u);
});

test("signs out every device after asking", async ({ page }) => {
  await openPage(page, "/profile");
  await page.getByRole("button", { name: "Sign out everywhere" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Sign out everywhere" }).click();
  await expect(page).toHaveURL(/\/login/u);
});
