# ❓ FAQ

### 🏠 Is there a hosted version?

No. Finance is self-hosted: it runs on a computer or a server of your own, with its own Postgres, and your records never leave it. [Getting started](./getting-started.md) runs it on your computer in two commands, [Deployment](./deployment.md) on a server.

### 👥 Can more than one person use it?

Yes: every account sees only its own data. On a server other people can reach, set `OWNER_EMAIL` so that only you can sign up; staging and production keep sign-up closed without it, and `REGISTRATION=open` lets anyone who finds the address create an account of their own. There is no sharing between accounts.

### 🔑 I lost `DATA_ENCRYPTION_KEY`. Can the data be recovered?

No. Every record is sealed with AES-256-GCM, and without the key it cannot be opened, not by the app and not by anyone else. Keep the key in a password manager, apart from the backups. A JSON export from **Settings → Data** is not sealed, so it can be read back into a new installation with a new key.

### 🔄 How do I change the encryption key?

Put the old key into `DATA_ENCRYPTION_KEY_PREVIOUS`, a new one into `DATA_ENCRYPTION_KEY` and restart. Each account's records are sealed again with the new key the first time it loads its data, see [Deployment](./deployment.md#-changing-the-encryption-key).

### 📵 I lost my phone with the authenticator app.

Sign in with one of the eight recovery codes, in the same field as the code. In **Profile → Sign-in**, turn two-step verification off with another recovery code and set it up again on the new phone. Without a recovery code, whoever runs the server can turn it off in the database, see [Deployment](./deployment.md#-locked-out-of-two-step-verification).

### 💱 Where do the exchange rates come from?

From Monobank every hour, with the official NBU rate when Monobank does not answer, and coin prices from CoinGecko. Past months are counted at the NBU's average rate of their month, balances and net worth at today's. You can also type a rate by hand in **Settings**. More in [Money and currencies](./money-and-currencies.md).

### 🏦 Does it work with my bank?

Monobank connects directly with your personal token and can send new operations as they happen. Any other bank works through its CSV statement: the import guesses which column is which and lets you correct it, suggests categories and skips duplicates. More in [Bank import](./bank-import.md).

### 🔔 Why does the Monobank webhook not turn on?

Monobank only calls `https:` addresses it can reach from the internet. Set `AUTH_URL` to the public `https:` address of the app behind a reverse proxy; on `localhost` the button stays off.

### 🔕 Why do notifications not arrive?

Notifications need the production build (`make stage-up`, `make prod-up` or `make build && make start`), because the service worker registers only there, an `https:` address or `localhost`, and permission in the browser. **Settings → Notifications** sends a test note. `REMINDERS=off` stops the morning note on purpose.

### 📴 What happens offline?

The pages you open keep working with the last numbers they loaded, and every edit waits in the browser until the server can be reached again, even after the page was closed. A reload without a network shows the offline page in your language, which comes back by itself once the connection returns.

### 🧾 I am not a sole proprietor. Will I see taxes?

No. A new account starts with **No tax**, so there is no tax calendar, no ЄСВ and nothing tax-related on the dashboard. Pick your regime in **Settings → Taxes** if you have one; a sole proprietor who does not pay ЄСВ for themselves turns off **I pay the social contribution (ЄСВ)** there, and the deductions and the calendar leave it out. An account made before this change keeps the regime it had, so change it there if it was never yours.

### 🌍 Can I add a language?

Yes: copy `en.ts` in `src/shared/i18n/messages/`, translate it and register it in two lists, see [Localization](./i18n.md#-adding-a-language).

### 🧪 Can I try it without Docker or a database?

Yes: `make dev-db` starts the dev server on a throwaway Postgres in memory, the same one the end-to-end tests use. Everything in it is gone when it stops.

### 💾 How do I back up my data?

Production keeps a nightly `pg_dump` for 14 days, and `make backup ENV=production` takes one at any time; **Settings → Data** downloads a JSON copy of one account. See [Deployment](./deployment.md#-backups).

### 🔎 Why does the app not show up in search engines?

On purpose: it holds private money, so every page says `noindex` and `robots.txt` blocks every crawler, see [SEO](./seo.md).

### 📦 I used an earlier version. How do I keep my data?

This version starts with a database of its own and a new schema. In the earlier app, download a JSON backup in **Settings → Data**; in this one, read it in under **Settings → Data**, and every entry, account and setting comes back. The old Docker volumes stay untouched until you remove them, see [Deployment](./deployment.md#-three-environments-one-makefile).
