import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const DASH = new RegExp(`[${String.fromCodePoint(0x2013, 0x2014)}]`, "u");
const SKIP = new Set([
  ".git",
  ".next",
  "blob-report",
  "coverage",
  "dev-dist",
  "dist",
  "lighthouse-live",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".scss",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const NAMES = new Set([
  ".dockerignore",
  ".editorconfig",
  ".env.example",
  ".gitignore",
  "Dockerfile",
  "LICENSE",
  "Makefile",
]);

// Whether a file holds text this check reads
const isText = (path) =>
  (EXTENSIONS.has(extname(path)) || NAMES.has(basename(path))) && basename(path) !== "package-lock.json";

// Every text file below a folder
const walk = (directory) =>
  readdirSync(directory).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return walk(path);
    return isText(path) ? [path] : [];
  });

const files =
  process.argv.length > 2
    ? process.argv
        .slice(2)
        .map((file) => join(root, file))
        .filter(isText)
    : walk(root);
const problems = files.flatMap((file) =>
  readFileSync(file, "utf8")
    .split("\n")
    .flatMap((line, index) =>
      DASH.test(line) ? [`${relative(root, file)}:${index + 1}: ${line.trim().slice(0, 80)}`] : [],
    ),
);

if (problems.length > 0) {
  process.stderr.write(`Use commas, colons or hyphens instead of em and en dashes:\n${problems.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`No em or en dashes in ${files.length} files.\n`);
