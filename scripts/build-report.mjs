import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const root = new URL("../", import.meta.url).pathname;
const build = join(root, ".next");

// Every file below a directory
const walk = (directory) =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const failures = [];
// Collects a failed check instead of stopping at the first one
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

// Reads a JSON manifest from the build output
const readJson = (file) => JSON.parse(readFileSync(join(build, file), "utf8"));

const localesSource = readFileSync(join(root, "src/shared/i18n/locales.ts"), "utf8");
const locales = [...(localesSource.match(/LOCALES = \[([^\]]+)\]/u)?.[1] ?? "").matchAll(/"([a-z]{2})"/gu)].map(
  (match) => match[1],
);
expect(locales.length > 0, "the list of languages could not be read from src/shared/i18n/locales.ts");

const prerender = readJson("prerender-manifest.json");
const routes = Object.keys(prerender.routes);
for (const route of [...locales.map((locale) => `/offline/${locale}`), "/robots.txt", "/icon.svg", "/apple-icon.png"]) {
  expect(routes.includes(route), `${route} was not prerendered`);
}
const flags = routes.filter((route) => route.startsWith("/flags/"));
expect(flags.length >= 250, `only ${flags.length} flags were prerendered`);

const proxy = readJson("server/functions-config-manifest.json").functions["/_middleware"];
expect(proxy !== undefined, "the proxy that sets the Content Security Policy and asks visitors to sign in is missing");

const headerRules = readJson("routes-manifest.json").headers;
// Header names next.config.ts sets for a source pattern
const headersFor = (source) =>
  new Set(
    headerRules
      .filter((entry) => entry.source === source)
      .flatMap((entry) => entry.headers.map((header) => header.key)),
  );
const pageHeaders = headersFor("/:path*");
for (const header of [
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Cross-Origin-Opener-Policy",
  "X-Robots-Tag",
]) {
  expect(pageHeaders.has(header), `the ${header} header is missing`);
}
for (const source of ["/flags/:path*"]) {
  expect(headersFor(source).has("Content-Security-Policy"), `${source} is served without a sandboxing policy`);
}

const appRoutes = Object.keys(readJson("server/app-paths-manifest.json"));
for (const route of [
  "/healthz/route",
  "/.well-known/security.txt/route",
  "/manifest.webmanifest/route",
  "/api/state/route",
  "/api/auth/[...nextauth]/route",
]) {
  expect(appRoutes.includes(route), `${route.replace(/\/route$/u, "")} is missing from the build`);
}

// Bytes as kilobytes for the report
const formatSize = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

const assets = walk(join(build, "static"))
  .filter((file) => /\.(js|css)$/u.test(file))
  .map((file) => {
    const content = readFileSync(file);
    return { name: relative(build, file), size: content.length, gzip: gzipSync(content).length };
  })
  .toSorted((a, b) => b.gzip - a.gzip);

// Gzipped size of all assets of one kind
const sum = (kind) =>
  assets.filter((asset) => asset.name.endsWith(kind)).reduce((total, asset) => total + asset.gzip, 0);
// Number of assets of one kind
const count = (kind) => assets.filter((asset) => asset.name.endsWith(kind)).length;

const lines = [
  "### 📦 Build output",
  "",
  `${routes.length} prerendered routes, ${flags.length} flags, ${locales.length} languages.`,
  "",
  "| File | Size | Gzip |",
  "| --- | ---: | ---: |",
  ...assets
    .slice(0, 10)
    .map((asset) => `| \`${asset.name}\` | ${formatSize(asset.size)} | ${formatSize(asset.gzip)} |`),
  `| **JavaScript, ${count(".js")} files** | | **${formatSize(sum(".js"))}** |`,
  `| **CSS, ${count(".css")} files** | | **${formatSize(sum(".css"))}** |`,
  "",
  failures.length === 0
    ? "✅ The robots rules, manifest, icons, flags, offline pages, the proxy and the security headers are in place."
    : failures.map((failure) => `❌ ${failure}`).join("\n"),
];

process.stdout.write(`${lines.join("\n")}\n`);
if (failures.length > 0) process.exitCode = 1;
