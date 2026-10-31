# 📜 Changelog

All notable changes to Finance are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). How versions are cut is described in [docs/releases.md](./docs/releases.md).

## [Unreleased]

## [1.0.0] - 2026-11-01

The first release.

### Added

- 📊 A dashboard with first steps for a new account, net worth from daily snapshots, this month against the last, heads-up notes such as bank operations waiting to be reviewed, quick add with the latest entries beside it, cash flow, spending with every budget, cash ahead for the next 30 or 60 days, holdings, subscriptions, currencies and progress, in a layout each account can rearrange.
- 💸 A month-by-month ledger with search, saved views, filters, tags, split purchases, receipt photos and QR scans of fiscal receipts, expenses paid partly for someone else, bulk edit and CSV export, and Copy and Make recurring on every entry; recurring rules and subscriptions weekly, monthly, quarterly or yearly with a real lifetime, instalments that end on their own, and monthly or yearly budgets with rollover, pace, a suggested limit and the month's rest moved between them.
- 🧾 Income with a day-rate calculator, taxes that are opt-in (no tax by default, a regime and ЄСВ on or off in Settings), tax per entry for every FOP group, the general system or a regime of your own, the annual limit, a tax calendar, a quarterly summary at the NBU rate of the day and the income book.
- 🏦 Accounts with derived balances, a check against Monobank, cryptocurrency and game item accounts, an archive for the ones no longer in use, savings goals of an account or of their own, credit cards with their grace period, allocation over time, debts and instalments with a payoff planner, and money owed to you.
- 📈 Investments that know how each kind earns, Inzhur funds from their published pages, the next 12 months and a schedule of top-ups, payouts and maturities.
- 🔮 A forecast up to 40 years ahead with three scenarios, the schedules ahead, planned events, a goal and a wishlist; a calendar of the month with its key dates; reports for a month, quarter, year or range of months against the period before or the same one a year earlier, kept in the address.
- 🧑‍🚀 Levels, XP, 70 achievements and a financial health score in seven parts.
- 🏦 Bank import from Monobank, with automatic import through its webhook, from any CSV statement or from a Monefy, Spendee or Wallet export, with categories and merchant names learned from corrections, a queue of new operations to review, transfer pairing, entries typed by hand matched to the bank's and duplicates skipped.
- 💱 Exchange rates and coin prices that refresh by themselves every hour, with each ended month counted at its average NBU rate.
- 🔔 Push notifications every morning with what is due, credit card grace periods included, a weekly or monthly summary, notes for new bank operations and budgets at 80 % and 100 %, encrypted end to end for each device, and a private calendar link for Google Calendar or Apple Calendar.
- 👥 Accounts for more than one person, each with its own data; `OWNER_EMAIL` limits sign-up to one address, and staging and production keep sign-up closed without it.
- 🔐 Passwords hashed with scrypt, passkeys, two-step verification with recovery codes, Google sign-in, recent sign-ins with a note for a new device, and signing out every device.
- 🔒 Every record sealed in Postgres with AES-256-GCM, a second key for changing it without downtime, and records sealed again with the new key on the next load.
- 💾 Edits that wait in the browser while the server cannot be reached, saves that send only the fields that changed and merge between devices field by field, and undo for every change that leaves other devices' edits alone.
- ⌨️ A command palette on <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd>, single-key shortcuts (<kbd>N</kbd>, <kbd>I</kbd>, <kbd>H</kbd>, <kbd>/</kbd>, <kbd>1</kbd> to <kbd>8</kbd>) that Settings can turn off, and entry sheets that open from the address and lead with the amount.
- 🙈 Amounts hidden on a device with the eye in the top bar or <kbd>H</kbd>, chart scales and money achievements included, for using the app where others can see the screen.
- 🌍 Ten languages: English, Ukrainian, Czech, German, Spanish, French, Italian, Dutch, Polish and Portuguese, with money, dates, plurals and exported spreadsheets in each.
- 🎨 Flat ink and lime tiles laid out as a bento over an aurora and a dot grid, in light, dark and system themes, in the design language of the other apps: a floating top bar with every page side by side as its pastel disc and name, an account menu and New entry, a tab bar with an add button and More on phones, capsule controls in two even heights, a round lime logo, the same icon disc beside the name of every tile, a sign-in page in two columns that follows the system theme, a greeting, Safe to spend, the month so far and Coming up on the dashboard, accounts and positions as cards in the colour of their kind, spending pace and a map of categories on Expenses, and calm motion: page transitions without morphing, a pill that slides to the open page, sheets and toasts that leave the way they came, and headline figures that roll to new values.
- ♿ WCAG 2.2 AA support: landmarks, a skip link, native dialogs, real radio groups, a combobox in the command palette, a hidden table behind every chart, reflow down to 320 px, and support for reduced motion, reduced transparency and forced colours.
- 📱 An installable web app with shortcuts and an offline page in every language.
- 🖨️ Every page printable in the light theme, without the navigation.
- 🚫 Kept out of every search engine by `robots.txt`, a `noindex` meta tag and an `X-Robots-Tag` header.
- 🛡️ A nonce-based Content Security Policy, security headers, validated input and rate limits on sign-in, sign-up and every sensitive route.
- 🧪 Unit tests with coverage thresholds, end-to-end tests on a throwaway Postgres in Chrome, Safari's WebKit and a phone, visual tests, axe checks and a Lighthouse budget in CI.
- 🐳 Docker images for development, staging and production: a multi-stage Dockerfile, a Compose overlay per environment with a database of its own, a non-root standalone server without Linux capabilities and with resource limits, a `/healthz` endpoint and nightly backups with optional copies off the server, and a development database that comes back after a reboot, answers on this computer only and is dumped every day; every release also publishes the image to GitHub Packages for amd64 and arm64 with provenance and an SBOM.
- 📡 A `security.txt` for private reports and a monitor that checks a running server every hour and its Lighthouse scores every week.
- 🪝 Git hooks and CI checks for formatting, one-line comments, em and en dashes, Conventional Commits and pull request titles.
- 🛠️ A Makefile with a coloured, grouped `make help`: setup that creates `.env` with fresh keys, the dev server on Docker or on a throwaway database, checks, end-to-end tests, every Docker environment, backups and restores, and a sync of the files the four apps share.

[Unreleased]: https://github.com/sacrificed666/finance/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/sacrificed666/finance/releases/tag/v1.0.0
