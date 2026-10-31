# 🛡️ Security policy

## ✅ Supported versions

Only the latest release receives security fixes, currently **1.x**. Finance is self-hosted, so there is no public instance to patch: a fix ships as a patch version, for example `1.0.1`, as described in [docs/releases.md](../docs/releases.md), and every owner updates their own server.

## 📮 Reporting a vulnerability

Please **do not open a public issue** for security problems.

1. Open the repository's **Security** tab and choose **Report a vulnerability** to send a private advisory.
2. Describe the problem, the affected version or commit and the steps to reproduce it.
3. If you have a proof of concept, attach it to the advisory rather than publishing it.

You can expect an acknowledgement within **3 working days** and a status update at least once a week until the report is resolved. Once a fix is released, the advisory is published and you are credited, unless you prefer to stay anonymous.

## 🎯 Scope

Finance is a Next.js server with accounts that keeps each person's money in their own Postgres database, every record sealed with AES-256-GCM. Reports are especially welcome about:

- 🔐 ways into another account: sessions, passwords, passkeys, two-step codes or Google sign-in;
- 🗄️ reading records from the database or a backup without the encryption key;
- 🔑 ways to read the Monobank token, the webhook key or the push subscriptions of an account;
- 💉 script injection through notes, category names, imported CSV files or bank statements;
- 🧱 ways to bypass the Content Security Policy, the rate limits or the other security headers;
- ⚙️ weaknesses in the Docker images, the backups or the GitHub Actions workflows.

The measures already in place are described in [docs/security.md](../docs/security.md).
