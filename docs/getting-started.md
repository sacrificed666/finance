# 🏁 Getting started

## 📋 Requirements

| Tool        | Version                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| 🟢 Node.js  | **24 or newer**; `.nvmrc` pins `26`, the newest line                         |
| 📦 npm      | 11 or newer (ships with Node 24)                                             |
| 🐳 Docker   | Docker Compose 2.22 or newer for `up --watch`; not needed for `make dev-db`  |
| 🛠️ GNU Make | Any version; macOS and Linux ship with it                                    |
| 🌐 Browser  | Chrome, Edge or Firefox 111+, Safari 16.4+ (the Next.js 16 browser baseline) |

If you use a version manager, run `nvm use` (or `fnm use`) in the project root.

## 🧰 First run

```bash
make setup     # packages, .env with fresh keys, Chromium and WebKit for the tests, Git hooks
make dev-up    # the dev server and Postgres in Docker, with hot reload
```

Open <http://localhost:3000>. The first visit goes to `/login`; create an account on `/register` with an email and a password of at least 10 characters. Every account sees only its own data.

The Docker setup is meant to hold real data too: the app and the database come back with Docker after a reboot, the app answers on this computer only (`APP_HOST=0.0.0.0` opens it to a phone on the same network) and sends `127.0.0.1` on to the `localhost` address `AUTH_URL` names, so the session cookie and the dev server's live reload stay on one address, and a `backup` service dumps the database once a day at `DEV_BACKUP_HOUR` (noon by default, while a laptop is awake) to `backups/auto/dev-*.dump`, keeping two weeks. A start takes a dump at once when there is none for the day yet.

> [!TIP]
> No Docker? `make dev-db` starts the dev server on a throwaway Postgres that lives in memory, the same one the end-to-end tests use. Everything it holds is gone when it stops, so it suits trying things out, not keeping your money.

> [!IMPORTANT]
> On a server other people can reach, set `OWNER_EMAIL`: only that email may then sign up, and only its account sees the server errors in Settings. Staging and production keep sign-up closed without it, unless `REGISTRATION=open`.

## 🔑 Environment variables

`make env` writes `.env` from `.env.example` with a new `AUTH_SECRET`, `DATA_ENCRYPTION_KEY` and database password; `make keys` prints a fresh pair any time. The variables are read when the server starts:

| Variable                                  | Required       | Meaning                                                                                        |
| ----------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `AUTH_URL`                                | ✅             | The address of the app, exactly as the browser shows it; passkeys depend on it                 |
| `AUTH_SECRET`                             | ✅             | Signs the sessions                                                                             |
| `DATA_ENCRYPTION_KEY`                     | ✅             | Seals every record in the database; without it a key is derived from `AUTH_SECRET`             |
| `DATA_ENCRYPTION_KEY_PREVIOUS`            | Optional       | The key before the last change, while records move to the new one                              |
| `OWNER_EMAIL`                             | Optional       | The only email that may sign up, and that sees the server errors                               |
| `REGISTRATION`                            | Optional       | `open` or `closed`; without either, sign-up is closed on staging and production                |
| `TRUSTED_PROXY_HOPS`                      | Optional       | How many proxies stand in front of the app and add to `X-Forwarded-For`, 1 by default          |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`   | Optional       | Google sign-in appears when both are set                                                       |
| `DATABASE_URL`                            | Outside Docker | Postgres for `make dev` and `npm run start`; Docker builds it from the `POSTGRES_` settings    |
| `DATABASE_POOL_MAX`                       | Optional       | How many connections the server keeps open, 10 by default                                      |
| `POSTGRES_USER` / `_PASSWORD` / `_DB`     | Docker         | The database the `db` service creates                                                          |
| `APP_HOST` / `APP_PORT` / `POSTGRES_PORT` | Docker         | Where the app and the database are published on the host; `APP_HOST` is `127.0.0.1` by default |
| `TZ` / `REMINDER_HOUR` / `REMINDERS`      | Optional       | When the morning push note goes out; `REMINDERS=off` stops it                                  |
| `VAPID_SUBJECT`                           | Optional       | The contact push services see, a `mailto:` or `https:` address                                 |
| `BACKUP_…`                                | Production     | The nightly backups, see [Deployment](./deployment.md#-backups)                                |
| `DEV_BACKUP_HOUR`                         | Development    | The hour of the daily dump in Docker, 12 by default                                            |

> [!CAUTION]
> `DATA_ENCRYPTION_KEY` is the key to your data. Keep it in a password manager next to, but never together with, your backups: without it the records cannot be read.

> [!WARNING]
> `AUTH_SECRET` must stay the same. Changing it signs every session out.

## 📜 npm scripts

| Script                  | What it does                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`           | 🔥 Starts the Next.js dev server with Turbopack and hot reload, against `DATABASE_URL`       |
| `npm run build`         | 📦 Type-checks the project and builds the standalone production bundle into `.next/`         |
| `npm start`             | 👀 Serves the production build                                                               |
| `npm run typecheck`     | 🧠 Generates the route types and runs the TypeScript 7 compiler without emitting             |
| `npm run lint`          | 🧹 Lints with Oxlint, including type-aware, React Compiler, Next.js and a11y rules           |
| `npm run lint:fix`      | 🩹 Applies the automatic Oxlint fixes                                                        |
| `npm run lint:text`     | 🧾 Finds em and en dashes in every text file and says where they are                         |
| `npm run format`        | 🎨 Formats every supported file with Oxfmt                                                   |
| `npm run format:check`  | 🔎 Fails if a file is not formatted                                                          |
| `npm test`              | 👁️ Starts Vitest in watch mode                                                               |
| `npm run test:run`      | 🧪 Runs the whole test suite once                                                            |
| `npm run test:coverage` | 📊 Runs the tests with V8 coverage and enforces the coverage thresholds                      |
| `npm run test:e2e`      | 🎭 Builds the app, starts it on a throwaway database and runs Playwright, axe and Lighthouse |
| `npm run check`         | ✅ Lint, the dash check, format check, type check and tests in one go, run it before pushing |

## 🛠️ make

Every common task has a short `make` command with a coloured summary of what it is doing:

| Command                                                 | What it does                                                                                                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make` or `make help`                                   | 📖 Every command, grouped by environment, with coloured **[DEV]**, **[STAGE]** and **[PROD]** tags                                                  |
| `make setup`                                            | 🧰 Installs the packages, creates `.env` with fresh keys, installs Chromium and WebKit for the tests and turns on the Git hooks                     |
| `make env` · `make keys`                                | 🔐 Creates the env file of `ENV` with fresh keys if it is missing, never overwrites one / prints a new pair of keys                                 |
| `make hooks`                                            | 🪝 Turns on the Git hooks in `.githooks/`: format, lint and dash checks of the staged files, and Conventional Commits for the message               |
| `make doctor`                                           | 🩺 Checks Node.js, npm, Docker, the packages and the keys in `.env`                                                                                 |
| `make dev` · `make dev-db`                              | 🚀 Starts the dev server against `DATABASE_URL` / against a throwaway database in memory, no Docker needed                                          |
| `make check` / `make ci`                                | ✅ The checks before pushing / everything CI runs: registry signatures, the changelog, the checks with coverage, the build report and the e2e tests |
| `make e2e-chromium` · `make e2e-webkit`                 | 🎭 The two end-to-end jobs of CI: Chromium with Lighthouse, or WebKit                                                                               |
| `make fix`                                              | 🪄 Applies the lint fixes and formats every file                                                                                                    |
| `make dev-up` · `make stage-up` · `make prod-up`        | 🐳 Starts an environment in Docker: development with hot reload, staging and production in the background                                           |
| `make stage-logs` · `make prod-psql` · `make dev-shell` | 📜 Every environment has the same commands: `up`, `down`, `restart`, `logs`, `ps`, `shell`, `psql`, `open` and `clean`                              |
| `make backup ENV=…` · `make restore ENV=… FILE=…`       | 💾 Dumps or restores the database of an environment; `make backup-now`, `make backup-check` and `make backups` drive the nightly service            |
| `make status`                                           | 🚦 Shows which environments are running                                                                                                             |
| `make shared` · `make shared-sync`                      | 🔗 Compares the files shared with the other three apps / copies the files of this app over them                                                     |
| `make live URL=…` · `make live-lighthouse URL=…`        | 📡 The checks of the monitor against a running server                                                                                               |
| `make screenshots`                                      | 📸 Takes the README pictures again from a fresh build on a throwaway database, see [Contributing](./contributing.md#-readme-pictures)               |
| `make clean` · `make reset`                             | 🧹 Removes build output and reports / also reinstalls the packages                                                                                  |

> [!NOTE]
> The Makefile needs GNU Make and Bash, which macOS and Linux ship with; on Windows use WSL or the npm scripts above. Colours switch off in pipes and with `NO_COLOR=1`.

## 🗂️ Project layout

```text
finance/
├── .github/
│   ├── ISSUE_TEMPLATE/              Bug report and feature request forms
│   ├── workflows/                   CI, CodeQL, releases, screenshots, the monitor and the shared files check
│   ├── dependabot.yml               Weekly npm, GitHub Actions and Docker updates
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── SECURITY.md                  How to report vulnerabilities
├── db/schema.sql                    The idempotent schema the server applies on every start
├── docker/                          Multi-stage Dockerfile, the three environment overlays and the backup script
├── docs/                            This documentation and its pictures
├── e2e/                             Playwright specs, the throwaway database and the data of the visual tests
├── lint/comments.js                 Custom Oxlint rule that keeps comments to one short line
├── public/                          The service worker, app icons and the bank, exchange and game logos
├── scripts/                         README pictures, release notes, the build report, the coverage summary, live checks and the dash check
├── src/
│   ├── proxy.ts                     The sign-in gate and the per-request Content Security Policy
│   ├── instrumentation.ts           Applies the schema and starts the push clock when the server boots
│   ├── app/                         Routes: (auth) and (app) groups, API handlers, the store, global styles
│   ├── widgets/                     The app shell, top bars, tab bar, brand, sync dot and footer
│   ├── features/                    One folder per area: accounts, auth, calendar, commands, dashboard, data, forecast,
│   │                                import, income, investments, market, notifications, profile, reports, settings, transactions
│   ├── shared/
│   │   ├── api/                     The Postgres pool and HTTP helpers (server only)
│   │   ├── assets/                  The flow lines of the backdrop, shared with tasks
│   │   ├── hooks/                   Browser hooks such as persisted view preferences
│   │   ├── i18n/                    Ten message catalogs, the translator, locale matching and the provider
│   │   ├── lib/                     Money, dates, guards, sealing, rate limiting, CSP and other helpers
│   │   ├── styles/                  Design tokens, mixins and the Tailwind preflight in a cascade layer
│   │   └── ui/                      The logo, page marks, cards, charts, sheets, pickers, controls and icons
│   ├── test/                        Test setup, database fakes and render helpers
│   └── types/                       Declarations for CSS modules
├── CHANGELOG.md                     Every release, newest first
├── Makefile                         make help, setup, dev, checks, Docker and backups
├── compose.yaml                     The Postgres and app services every environment shares
├── next.config.ts                   React Compiler, the standalone output and the security headers
├── playwright.config.ts             Browsers, the throwaway database and the production server for end-to-end tests
├── vitest.config.ts                 Test environment, aliases and coverage thresholds
├── .dockerignore                    Keeps dependencies, build output, dumps and secrets out of the image
├── .oxlintrc.json                   Lint rules and layer boundaries
└── .oxfmtrc.json                    Formatting rules
```

Every feature has a `model/` folder for its logic, an `api/` folder for server code and requests when it has any, and a `ui/` folder with one folder per component, for example `features/transactions/ui/LedgerCard/LedgerCard.tsx` and `LedgerCard.module.scss`. Tests sit next to the code they cover as `*.test.ts(x)`. The layers and their rules are explained in [Architecture](./architecture.md#-layers).

## 💻 Editor setup

Editor settings are not committed. For the best experience in VS Code, install:

- 🦀 **Oxc**: inline Oxlint diagnostics and Oxfmt formatting on save
- ⚡ **Vitest**: run and debug tests from the editor
- 🎭 **Playwright Test for VS Code**: run end-to-end tests and record locators
- 📝 **EditorConfig**: consistent whitespace settings (`.editorconfig` is part of the repository)

## 👉 Next steps

- ✨ Learn what the app can do in [Features](./features.md).
- 🏗️ See how a page gets its data and saves it in [Architecture](./architecture.md).
- 🗄️ Read how the data is stored and sealed in [Data model](./data-model.md) and [Security](./security.md).
- 🧪 Run the whole suite as described in [Testing](./testing.md).
