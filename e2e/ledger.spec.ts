import type { Page } from "@playwright/test";
import makeQr from "qrcode-generator";

import { expect, openPage, saved, test } from "./helpers";

// The link a Ukrainian fiscal receipt's QR code holds
const RECEIPT =
  "https://cabinet.tax.gov.ua/cashregs/check?mac=001A&date=20260904&time=1130&id=45&sm=780.00&fn=3000898168";

// A receipt's QR code as a picture, the way a photo of it comes in
const receiptPhoto = (link: string): Buffer => {
  const qr = makeQr(0, "M");
  qr.addData(link);
  qr.make();
  return Buffer.from(qr.createDataURL(8, 4).split(",")[1] ?? "", "base64");
};

// Whether the browser keeps changes the server has not taken
const pending = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open("finance-tracker", 1);
        open.addEventListener("upgradeneeded", () => open.result.createObjectStore("outbox"));
        open.addEventListener("success", () => {
          const get = open.result.transaction("outbox", "readonly").objectStore("outbox").get("pending");
          get.addEventListener("success", () => {
            open.result.close();
            resolve(Boolean(get.result));
          });
          get.addEventListener("error", () => resolve(false));
        });
        open.addEventListener("error", () => resolve(false));
      }),
  );

test("adds, edits and deletes an entry, keeping each step on the server", async ({ page }) => {
  await openPage(page, "/transactions?add=expense");
  const sheet = page.getByRole("dialog", { name: "New transaction" });
  await sheet.getByPlaceholder("0", { exact: true }).fill("120");
  await sheet.getByRole("textbox", { name: "Note" }).fill("Coffee beans");
  let saving = saved(page);
  await sheet.getByRole("button", { name: "Save" }).click();
  await saving;
  await expect(page).toHaveURL(/\/transactions$/u);
  const row = page.getByRole("button", { name: /^Coffee beans/u });
  await expect(row).toBeVisible();

  await page.reload();
  await row.click();
  const edit = page.getByRole("dialog", { name: "Edit transaction" });
  await edit.getByPlaceholder("0", { exact: true }).fill("150");
  saving = saved(page);
  await edit.getByRole("button", { name: "Save" }).click();
  await saving;
  await expect(row).toContainText("150");

  await row.click();
  await page.getByRole("dialog", { name: "Edit transaction" }).getByRole("button", { name: "Delete" }).click();
  saving = saved(page);
  await page.getByRole("dialog", { name: "Delete this transaction?" }).getByRole("button", { name: "Delete" }).click();
  await saving;
  await expect(row).toHaveCount(0);
  saving = saved(page);
  await page.getByRole("button", { name: "Undo" }).click();
  await saving;
  await expect(row).toBeVisible();
  await page.reload();
  await expect(row).toContainText("150");
});

test("fills a new expense from a photo of a receipt's QR code", async ({ page }) => {
  await openPage(page, "/transactions?add=expense");
  const sheet = page.getByRole("dialog", { name: "New transaction" });
  const chooser = page.waitForEvent("filechooser");
  await sheet.getByRole("button", { name: "Scan receipt QR" }).click();
  await (await chooser).setFiles({ name: "receipt.gif", mimeType: "image/gif", buffer: receiptPhoto(RECEIPT) });
  await expect(sheet.getByText(/^Filled from the receipt/u)).toBeVisible();
  await expect(sheet.getByPlaceholder("0", { exact: true })).toHaveValue("780");
});

test("opens a new income entry from the address and closing clears it", async ({ page }) => {
  await openPage(page, "/transactions?add=income");
  const sheet = page.getByRole("dialog", { name: "New transaction" });
  await expect(sheet.getByRole("radio", { name: "Income" })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/transactions$/u);
});

test("finds a page in the command palette", async ({ page }) => {
  await openPage(page, "/");
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog");
  await expect(palette).toBeVisible();
  await page.keyboard.type("repo");
  await expect(palette.getByRole("option").first()).toContainText("Reports");
  await page.keyboard.press("Enter");
  // The first visit to a page may take a while on a slow machine
  await expect(page).toHaveURL(/\/reports$/u, { timeout: 15_000 });
  await expect(palette).toHaveCount(0);
});

test.describe("when the server refuses a save", () => {
  // Requests a service worker passes on slip past the routes of WebKit
  test.use({ serviceWorkers: "block" });

  test("keeps the edit and brings it back after a reload", async ({ page }) => {
    await page.route("**/api/state", (route) =>
      route.request().method() === "PATCH" ? route.fulfill({ status: 503, json: {} }) : route.fallback(),
    );
    await openPage(page, "/transactions?add=expense");
    const sheet = page.getByRole("dialog", { name: "New transaction" });
    await sheet.getByPlaceholder("0", { exact: true }).fill("75");
    await sheet.getByRole("textbox", { name: "Note" }).fill("Kept offline");
    await sheet.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: /^Kept offline/u })).toBeVisible();
    // The browser keeps the change once the save fails
    await expect.poll(() => pending(page)).toBe(true);
    await page.unroute("**/api/state");
    await page.reload();
    await expect(page.getByText("Restored 1 change that had not reached the server")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Kept offline/u })).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("button", { name: /^Kept offline/u })).toHaveCount(0);
    // Undoing it leaves nothing for the browser to keep
    await expect(async () => {
      await page.reload();
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.getByText(/had not reached the server/u)).toHaveCount(0);
    }).toPass();
  });
});

test("merges an entry added in another tab", async ({ page, context }) => {
  await openPage(page, "/transactions");
  const other = await context.newPage();
  await openPage(other, "/transactions?add=expense");
  const sheet = other.getByRole("dialog", { name: "New transaction" });
  await sheet.getByPlaceholder("0", { exact: true }).fill("40");
  await sheet.getByRole("textbox", { name: "Note" }).fill("From the other tab");
  const saving = saved(other);
  await sheet.getByRole("button", { name: "Save" }).click();
  await saving;
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("button", { name: /^From the other tab/u })).toBeVisible();
});
