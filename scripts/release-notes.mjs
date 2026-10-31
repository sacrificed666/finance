import { readFileSync } from "node:fs";

// Reads a file from the project root
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

// Prints the reason and stops the release
const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

const { version } = JSON.parse(read("package.json"));
const tag = process.argv[2] ?? `v${version}`;

if (!/^\d+\.\d+\.\d+$/u.test(version)) fail(`package.json has no SemVer version: "${version}"`);
if (tag !== `v${version}`) fail(`The tag ${tag} does not match the version ${version} in package.json`);

const changelog = read("CHANGELOG.md");
const heading = new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "mu");
const start = changelog.search(heading);
if (start === -1) fail(`CHANGELOG.md has no "## [${version}] - YYYY-MM-DD" section`);

const body = changelog.slice(start).split("\n").slice(1);
const end = body.findIndex((line) => /^(?:## |\[[^\]]+\]: )/u.test(line));
const notes = (end === -1 ? body : body.slice(0, end)).join("\n").trim();
if (notes === "") fail(`The ${version} section of CHANGELOG.md is empty`);

process.stdout.write(`${notes}\n`);
