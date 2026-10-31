import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const self = basename(root);
const APPS = ["tasks", "weather", "faceit-stats", "finance"];
const NEXT_APPS = new Set(["weather", "faceit-stats", "finance"]);
const VERCEL_APPS = new Set(["weather", "faceit-stats"]);
const SHARED = [
  ".editorconfig",
  ".githooks/commit-msg",
  ".githooks/pre-commit",
  ".github/dependabot.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".nvmrc",
  "lint/comments.js",
  "scripts/check-live.mjs",
  "scripts/check-shared.mjs",
  "scripts/check-text.mjs",
  "scripts/coverage-summary.mjs",
  "scripts/lighthouse-live.mjs",
  "scripts/release-notes.mjs",
];
const SHARED_BY_NEXT = [
  ".oxfmtrc.json",
  "src/features/notifications/model/offlinePage.test.ts",
  "src/features/notifications/model/offlinePage.ts",
  "tsconfig.json",
];
const SHARED_BY_VERCEL = [
  ".dockerignore",
  ".gitignore",
  "public/sw.js",
  "src/instrumentation.test.ts",
  "src/instrumentation.ts",
  "src/features/notifications/ui/ServiceWorker/ServiceWorker.test.tsx",
  "src/features/notifications/ui/ServiceWorker/ServiceWorker.tsx",
  "vercel.json",
];

// Whether both apps belong to a group
const both = (group, a, b) => group.has(a) && group.has(b);

// The files two apps must keep identical
const sharedFiles = (a, b) => [
  ...SHARED,
  ...(both(NEXT_APPS, a, b) ? SHARED_BY_NEXT : []),
  ...(both(VERCEL_APPS, a, b) ? SHARED_BY_VERCEL : []),
];

// --sync copies the files of this app over the others; a folder may follow
const args = process.argv.slice(2);
const sync = args.includes("--sync");
const folder = args.find((arg) => !arg.startsWith("--"));
// The folder with the other apps: the argument, or the parent of this one
const parent = folder ? resolve(folder) : join(root, "..");
// How another app is named in the messages
const where = (app) => relative(process.cwd(), join(parent, app)) || app;

const siblings = APPS.filter((app) => app !== self && existsSync(join(parent, app, "package.json")));
if (siblings.length === 0) {
  process.stdout.write("No sibling apps next to this one, nothing to compare.\n");
  process.exit(0);
}

// Whether a shared file is missing in either app or differs between them
const differs = (file, app) => {
  const mine = join(root, file);
  const theirs = join(parent, app, file);
  return !existsSync(mine) || !existsSync(theirs) || readFileSync(mine, "utf8") !== readFileSync(theirs, "utf8");
};

const drifted = siblings.flatMap((app) =>
  sharedFiles(self, app).flatMap((file) => (differs(file, app) ? [{ file, app }] : [])),
);

if (drifted.length === 0) {
  process.stdout.write(`The shared files match ${siblings.map(where).join(" and ")}.\n`);
  process.exit(0);
}

if (!sync) {
  const lines = drifted.map(({ file, app }) => `${file} differs from ${where(app)}`);
  process.stderr.write(
    `Shared files drifted apart:\n${lines.join("\n")}\nRun it with --sync to copy the files of ${self} over them.\n`,
  );
  process.exit(1);
}

const missing = [...new Set(drifted.map(({ file }) => file))].filter((file) => !existsSync(join(root, file)));
if (missing.length > 0) {
  process.stderr.write(`Missing in ${self}, so there is nothing to copy:\n${missing.join("\n")}\n`);
  process.exit(1);
}

// Copies a file of this app over another app, keeping it executable if it is
for (const { file, app } of drifted) {
  const source = join(root, file);
  const target = join(parent, app, file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  chmodSync(target, statSync(source).mode);
  process.stdout.write(`Copied ${file} to ${where(app)}\n`);
}
process.stdout.write(`The shared files of ${siblings.map(where).join(" and ")} now match ${self}.\n`);
