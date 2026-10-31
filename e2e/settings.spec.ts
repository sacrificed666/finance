import { readFile } from "node:fs/promises";

import { expect, openPage, saved, test } from "./helpers";

test("adds an account that the dashboard counts", async ({ page }) => {
  await openPage(page, "/accounts");
  await page.getByRole("button", { name: "Account", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "New account" });
  await sheet.getByPlaceholder("Monobank card").fill("Black card");
  await sheet.getByRole("textbox", { name: /^Opening balance/u }).fill("1000");
  const saving = saved(page);
  await sheet.getByRole("button", { name: "Save" }).click();
  await saving;
  await expect(page.getByRole("button", { name: /^Black card/u })).toBeVisible();
  await openPage(page, "/");
  await expect(page.locator("main")).toContainText("1,000");
});

test("keeps the chosen theme after a reload", async ({ page }) => {
  await openPage(page, "/settings");
  const saving = saved(page);
  await page.getByRole("group", { name: "Theme" }).getByText("Light", { exact: true }).click();
  await saving;
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("downloads a backup and reads it back in after asking", async ({ page }) => {
  await openPage(page, "/transactions?add=expense");
  const sheet = page.getByRole("dialog", { name: "New transaction" });
  await sheet.getByPlaceholder("0", { exact: true }).fill("99");
  await sheet.getByRole("textbox", { name: "Note" }).fill("Backed up");
  const saving = saved(page);
  await sheet.getByRole("button", { name: "Save" }).click();
  await saving;

  await openPage(page, "/settings");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^finance-backup-\d{4}-\d{2}-\d{2}\.json$/u);
  const file = await download.path();
  expect(await readFile(file, "utf8")).toContain("Backed up");

  await page.getByLabel("Import from file").setInputFiles(file);
  await page
    .getByRole("dialog", { name: "Replace all data from the file?" })
    .getByRole("button", { name: "Replace" })
    .click();
  await expect(page.getByText(/^Imported 1 records/u)).toBeVisible();
});

test("names a file that is not a backup", async ({ page }) => {
  await openPage(page, "/settings");
  await page.getByLabel("Import from file").setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.getByText("The file does not look like a backup of this app.")).toBeVisible();
});
