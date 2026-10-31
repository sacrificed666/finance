// Checks that the live site answers, for the monitor workflow
import { readFileSync } from "node:fs";
import process from "node:process";

// Timeouts and retries of every request, and how fresh the answers must be
const TIMEOUT = 20_000;
const ATTEMPTS = 3;
const PAUSE = 5000;
const DAY = 24 * 60 * 60 * 1000;
const MIN_VALID_DAYS = 30;
const MAX_AGE_SECONDS = Number(process.env.MAX_AGE_SECONDS ?? 7200);

// The site and its paths: the arguments, or MONITOR_URL and package.json
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const [siteArgument, ...pathArguments] = process.argv.slice(2);
const site = [siteArgument, process.env.MONITOR_URL, packageJson.homepage].find(Boolean);
const paths = pathArguments.length > 0 ? pathArguments : (packageJson.monitor?.paths ?? []);
if (!site || paths.length === 0) {
  process.stderr.write("Usage: node scripts/check-live.mjs [site] [path...]\n");
  process.exit(2);
}

// Waits for the given time
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetches a page, again after network errors and server errors
const load = async (url, attempt = 1) => {
  const started = performance.now();
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "sacrificed-monitor" },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const body = await response.text();
    if (response.status < 500 || attempt === ATTEMPTS) {
      return { response, body, ms: Math.round(performance.now() - started) };
    }
  } catch (error) {
    if (attempt === ATTEMPTS) throw error;
  }
  await sleep(PAUSE);
  return load(url, attempt + 1);
};

// What is wrong with a security.txt, or how long it stays valid
const checkSecurityTxt = (body) => {
  const expires = Date.parse(/^Expires: (.+)$/mu.exec(body)?.[1] ?? "");
  if (Number.isNaN(expires)) return { ok: false, note: "No Expires field" };
  const days = Math.floor((expires - Date.now()) / DAY);
  return { ok: days >= MIN_VALID_DAYS, note: `Valid for ${days} more days` };
};

// A JSON answer must have no error, a good status, fresh data and no empty list
const checkJson = (body) => {
  const data = JSON.parse(body);
  if (data.error) return { ok: false, note: `Error: ${data.error}` };
  if (data.status && !["ok", "ready"].includes(data.status)) return { ok: false, note: `Status: ${data.status}` };
  const age = typeof data.ageSeconds === "number" ? data.ageSeconds : null;
  if (age !== null && age > MAX_AGE_SECONDS) return { ok: false, note: `Data is ${Math.round(age / 60)} min old` };
  const empty = Object.keys(data).find((key) => Array.isArray(data[key]) && data[key].length === 0);
  if (empty) return { ok: false, note: `Empty list: ${empty}` };
  return { ok: true, note: age === null ? "" : `Data is ${age} s old` };
};

// What is wrong with the body of an answer, by what it is
const inspect = (path, type, body) => {
  if (path.endsWith("security.txt")) return checkSecurityTxt(body);
  if (type.includes("json")) return checkJson(body);
  if (path.includes("healthz")) return { ok: body.trim() === "ok", note: "" };
  if (type.includes("html")) return { ok: /<title>[^<]+<\/title>/u.test(body), note: "" };
  return { ok: body.length > 0, note: "" };
};

// One row of the report for a path, and whether it passed
const check = async (path) => {
  const url = new URL(path, site);
  try {
    const { response, body, ms } = await load(url);
    const type = response.headers.get("content-type") ?? "";
    const { ok, note } = response.ok ? inspect(path, type, body) : { ok: false, note: "" };
    if (!ok) process.stderr.write(`${url.href}: ${response.status} ${note}\n`);
    return { ok, row: `| \`${path}\` | ${ok ? "✅" : "❌"} ${response.status} | ${ms} ms | ${note} |` };
  } catch (error) {
    process.stderr.write(`${url.href}: ${error.message}\n`);
    return { ok: false, row: `| \`${path}\` | ❌ | | ${error.message} |` };
  }
};

const results = await Promise.all(paths.map(check));
const report = [
  `### 📡 ${new URL(site).host}`,
  "",
  "| Path | Answer | Time | Note |",
  "| ---- | ------ | ---- | ---- |",
  ...results.map(({ row }) => row),
];
process.stdout.write(`${report.join("\n")}\n`);
process.exitCode = results.every(({ ok }) => ok) ? 0 : 1;
