# 🔎 SEO

Finance holds a person's money, so the goal of its search engine settings is the opposite of the other apps: **no page may ever be crawled, indexed or previewed**. What remains is the metadata a person sees themselves: the tab title, the installed app and its shortcuts.

## 🚫 Kept out of every search engine

Three independent layers say the same thing, so a mistake in one never exposes a page:

| Layer                     | Where                | What it says                                                   |
| ------------------------- | -------------------- | -------------------------------------------------------------- |
| 🤖 `robots.txt`           | `src/app/robots.ts`  | `User-agent: *` and `Disallow: /`, with no sitemap             |
| 🏷️ `<meta name="robots">` | `src/app/layout.tsx` | `noindex, nofollow` on every page, the sign-in page included   |
| 📨 `X-Robots-Tag`         | `next.config.ts`     | `noindex, nofollow` on every response, API and images included |

Every page except `/login` and `/register` also needs a session, so a crawler that ignores all three only ever reaches the sign-in form. There is no sitemap, no structured data and no share card: a link pasted into a chat shows the bare address.

> [!IMPORTANT]
> Keep all three layers. `robots.txt` alone does not keep a page out of an index: a page that is linked from elsewhere can be listed without being crawled, and only `noindex` in the page or the header removes it.

## 🏷️ Metadata

| Field          | Value                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------- |
| 🏷️ Title       | The page in the account's language and the app name: `Expenses · Finances`, `Settings · Finances` |
| 📝 Description | The app description, for the installed app                                                        |
| 🤖 Robots      | `noindex, nofollow`                                                                               |
| 🎨 Theme       | `#f3f3ef` in light and `#09090b` in dark, for the browser's toolbar                               |

The defaults live in `src/app/layout.tsx`, which sets `title.template` to `%s · Finances` in the visitor's language. Every page sets its own title with `titled(key)` from `shared/i18n/server.ts`, so the tab, the history and a bookmark name the page in the language of its reader.

## 📲 The installed app

`src/app/manifest.ts` answers `manifest.webmanifest` in the visitor's language: the name and description, `standalone` display, the dark launch colour (so a dark theme never starts with a white flash), icons in 192 and 512 px with a maskable one, and three shortcuts:

| Shortcut          | Opens                                             |
| ----------------- | ------------------------------------------------- |
| ➖ Add an expense | `/?add=expense`, the entry sheet on the dashboard |
| ➕ Add income     | `/income?add=income`                              |
| 📅 Calendar       | `/calendar`                                       |

The shortcuts reuse the entry sheets opened from the address, see [Architecture](./architecture.md#-sheets-opened-from-the-address). `e2e/seo.spec.ts` checks the manifest and that every shortcut opens what it promises.

## 🌍 The address

The app has no domain of its own: `AUTH_URL` is the address it is served from, and the passkeys and the Monobank webhook build their addresses from it, and `siteUrl()` in `shared/lib/site.ts` reads it for `security.txt`, falling back to `http://localhost:3000`. Pages carry no canonical link and no `hreflang`, because the language belongs to the account, not to the address, see [Localization](./i18n.md).

## ⚡ Page experience

- 📄 The shell, the top bar and the page skeleton are server-rendered HTML in the right language and theme; the numbers follow as soon as the account's data arrives.
- 🔤 Montserrat is self-hosted by `next/font`, so no request leaves for a font service.
- 🖼️ Logos and flags have explicit sizes and charts are SVG, so nothing shifts when the page loads.
- 🧭 The manifest, an SVG icon, an Apple touch icon and theme colours for light and dark are generated from `src/app`.
- 🚦 A Lighthouse budget in CI keeps performance, accessibility and best practices in check, see [Testing](./testing.md#-lighthouse-budget). SEO is left out of it on purpose: a page that asks not to be indexed cannot score there.
