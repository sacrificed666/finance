// Runs Lighthouse on live pages and fails below the budget
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";

import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

// The debugging port, the report folder and the performance budget per device
const PORT = 9335;
const OUT = "lighthouse-live";
const BUDGETS = { phone: 0.8, desktop: 0.9 };
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

// The pages: the arguments, or the monitor pages of package.json on MONITOR_URL
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const site = [process.env.MONITOR_URL, packageJson.homepage].find(Boolean);
const pages = (packageJson.monitor?.pages ?? []).map((page) => new URL(page, site).href);
const urls = process.argv.length > 2 ? process.argv.slice(2) : pages;
if (urls.length === 0) {
  process.stderr.write("Usage: node scripts/lighthouse-live.mjs [url...]\n");
  process.exit(2);
}

// A file name for the report of a page on a device
const reportName = (url, device) =>
  `${new URL(url).pathname.replaceAll(/[^\w-]+/gu, "-").replaceAll(/^-|-$/gu, "") || "home"}-${device}.html`;

// The lowest score a category may have on a device
const lowest = (category, device) => (category === "performance" ? BUDGETS[device] : 1);

// The scores of one page on one device, with a saved HTML report
const audit = async ({ url, device }) => {
  const browser = await chromium.launch({ args: [`--remote-debugging-port=${PORT}`] });
  try {
    const result = await lighthouse(
      url,
      { port: PORT, output: "html", logLevel: "error" },
      device === "desktop" ? desktopConfig : undefined,
    );
    const report = result?.lhr;
    if (!report || report.runtimeError) throw new Error(report?.runtimeError?.message ?? "No report");
    if (typeof result.report === "string") await writeFile(`${OUT}/${reportName(url, device)}`, result.report);
    const scores = CATEGORIES.map((category) => ({
      score: report.categories[category]?.score ?? 0,
      ok: (report.categories[category]?.score ?? 0) >= lowest(category, device),
    }));
    const cells = scores.map(({ score, ok }) => `${ok ? "" : "❌ "}${Math.round(score * 100)}`);
    return { ok: scores.every(({ ok }) => ok), row: `| ${url} | ${device} | ${cells.join(" | ")} |` };
  } catch (error) {
    return { ok: false, row: `| ${url} | ${device} | ❌ ${error.message} | | | |` };
  } finally {
    await browser.close();
  }
};

// Audits the pages one after another, as Lighthouse needs the whole machine
const auditAll = async ([next, ...rest], results = []) =>
  next ? auditAll(rest, [...results, await audit(next)]) : results;

await mkdir(OUT, { recursive: true });
const results = await auditAll(urls.flatMap((url) => ["phone", "desktop"].map((device) => ({ url, device }))));
const report = [
  "### 🚦 Lighthouse on the live site",
  "",
  "| Page | Device | Performance | Accessibility | Best practices | SEO |",
  "| ---- | ------ | ----------- | ------------- | -------------- | --- |",
  ...results.map(({ row }) => row),
];
process.stdout.write(`${report.join("\n")}\n`);
if (results.some(({ ok }) => !ok)) process.stderr.write("Some scores are below the budget.\n");
process.exitCode = results.every(({ ok }) => ok) ? 0 : 1;
