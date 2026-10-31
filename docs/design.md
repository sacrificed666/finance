# 🎨 Design system

The interface is ink and lime: flat **tiles** with hairline edges laid out as a bento over an ink backdrop, where a lime **aurora** and the open page's colour glow from the top over a fading dot grid. Lime is the accent and money coming in, coral is money going out, and every page has a pastel disc of its own in the **top bar**. Every word is Montserrat, the names of tiles in small, bold, spaced capitals. It keeps the language of the other apps in this portfolio: Montserrat, colourful page marks, capsule controls and spring motion.

## 💡 Principles

- 🔢 **The headline first.** Every page opens with one figure that answers its question, the same figure another way, and three or four figures that explain it.
- 🧭 **The same block in the same place.** Every page is built from the same skeleton, so a person always knows where to look.
- 🔁 **Nothing shown twice.** A card below the hero never repeats the hero's figures, and two cards never show the same list.
- 🫥 **Empty is not shown.** A key names only what is there (the calendar's lists only the kinds of events the month has), a mark already in colour needs no word beside it (an earned achievement drops its **Unlocked** chip), a tile with nothing in it is left out rather than showing a placeholder (a page with nothing yet shows its headline alone, without a row of zero figures beside it), a count says what it counts (a category's line reads "5 subcategories · 34 records", not two bare numbers), a card with a single row folds into its neighbour, and zero-balance accounts fold into one row. A total over a list of one is left out too: a single goal, debt or loan stands on its own row.
- 🎨 **Colour has a meaning.** Green is income, red is overspend, amber is a warning; chart series never borrow those hues, and the page tones stay in the chrome and the backdrop.
- 🧘 **Calm by default.** Nothing on the page moves by itself, and motion disappears when the system asks for less.
- 💊 **Capsules for controls, circles for marks, rounded rectangles for content.** Buttons, fields, pickers, segmented controls and the phone bars are capsules; every icon mark (a card's or a hero's disc, a page mark, an avatar, a legend swatch) is a circle; cards, tiles, rows and text areas are rounded rectangles.
- ⭕ **Three radii for content.** Sheets round 26 px (`--radius-xl`), tiles, cards, popovers and the footer 22 px (`--radius-lg`), and everything inside them 14 px (`--radius-in-card`): rows, panels, tables, callouts and text areas, at any depth.
- 🍱 **A bento of tiles.** Every block is a flat tile of its own, sized by what it holds: the headline in a lit tile, the figures that explain it in small tiles beside it, the cards below. Rows are split by hairlines rather than stripes.

## 🧭 Layout

Every page is built from the same pieces:

```tsx
<PageHeader title={…} subtitle={…} action={…} />
<PageBody>
  <PageHero label={…} icon={…} action={…} value={…} sub={…} delta={…} aside={<HeroTrend … />} stats={[…]} />
  <Split main={<>charts, lists, tables</>} side={<>summaries, breakdowns, controls</>} />
</PageBody>
```

- **Sign-in and sign-up** stand in two columns from `lg`: the logo, a headline and what the app keeps, each beside its page's disc, on the left, the form on the right; phones keep the logo and the form. They follow the device's theme until an account picks one.
- **`PageHeader`** is the page's title, the largest words on it (30 to 44 px, extra bold), with its main actions on the right; only the dashboard has a line under it, the date, since a page that names itself needs no description. The page's colour lives in its disc in the top bar and in the backdrop's aurora, so the title needs no mark of its own.
- **`PageHero`** is the opening row of the page. A lit tile (`glow`) holds its name in small capitals with its disc, the figure in the `num-hero` size (40 to 60 px, extra bold), the change as a tinted chip and a picture: beside the figure from `lg`, under it across the tile from `xl` when the tile has company. The figures that explain it are tiles of their own, two by two beside the headline from `xl`, a row of their own from `md` and two a row on phones, and a figure with `href` links to its page. Three put the last one across the full row, two share a row and a lone one takes it whole, so a page can leave out a figure it has nothing for. A page can bring its own tiles instead through `side`, as the dashboard does.
- **`HeroTrend` and `HeroSplit`** fill the right half of the hero: a labelled area trend, or a split bar with a legend. A trend drops the flat months before anything moved, keeping the last of them and at least six months, and its title counts what is left ("Last 8 months").
- **`Split`** puts the main column on 8 of 12 columns and the side column on 4 from the `xl` breakpoint (80 rem). Each column is its own stack, so cards of different heights never leave holes; between `md` and `xl` the side cards pair up two per row. `stickySide` keeps a short side column in view beside a long list, and `sideFirst` puts the side column first on phones when it holds the controls. A `tail`, such as the list of every income or the recent sign-ins, ends the main column on wide screens and comes after the side cards on narrower ones, so a long list never buries them; the side column then spans both rows and any height it has left over falls below the tail, never between it and the main cards.
- **`Pair`** sets two cards side by side inside a column.
- **Loading outlines** (`shared/ui/Skeleton`) draw a page in its own shape while the account's data is on its way: the header with its title and actions, the hero with its figure, picture and tiles, then the same `Split` columns of cards, each with its round mark, name and a body like the real one (list rows, a chart block, tiles, a split bar, form fields). `PageSkeleton` in `widgets/AppShell` keeps one outline per page, so nothing jumps when the numbers arrive; the profile shows its outline while its details load, the recent sign-ins and passkeys outline their rows, two-step sign-in its QR code and fields, and a receipt thumbnail shimmers until its picture covers it. Only the bars shimmer; the cards stay still.

| Page        | Hero headline                                         | Hero picture                                          | Hero figures                                                                                                       |
| ----------- | ----------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Dashboard   | Net worth, in every currency                          | The trend of the last months, or its parts while flat | Safe to spend today, the month so far                                                                              |
| Calendar    | The month's net, with a month switcher                | The net building up day by day, with its lowest point | Still to go out, still to come in, taxes due, busiest day, no-spend days                                           |
| Reports     | The period's net, with arrows to step between periods | Where the money went, by category                     | Income, expenses, savings rate, per day, each against the period before                                            |
| Expenses    | The month's spending, with a month switcher           | Its pace against last month, day by day               | Income, net, per day, budget left                                                                                  |
| Income      | This month                                            | Income over the last months                           | Monthly average of the last full months, year to date, then tax, planned, next payday and stability as room allows |
| Accounts    | Money in accounts                                     | The last six months, then the split by account type   | Net worth, emergency fund, savings goals, debts                                                                    |
| Investments | Current value                                         | Expected value over the next 12 months                | Invested, earned, what it earns in a year; maturities live in the schedule card                                    |
| Forecast    | The base scenario at the horizon                      | Where the end figure comes from                       | Now, cautious, optimistic, independence                                                                            |
| Profile     | Avatar, name and details, with **Edit profile**       | Level, progress and XP sources                        | Health, achievements, weekly streak, months in the plus                                                            |
| Settings    | Records in the database                               | Entries logged a month                                | Accounts, investments, categories, subscriptions                                                                   |

Below the hero:

| Page        | Main column                                                                                   | Side column                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Dashboard   | First steps until done, quick add, cash flow, spending by category, cash ahead, subscriptions | Coming up, recent entries, allocation by holding or currency, progress                          |
| Calendar    | The month grid, spending by weekday                                                           | The chosen day, key dates, week by week                                                         |
| Reports     | Money flow, categories compared, category trends                                              | Kept each month, fixed and flexible, spent by account, largest expenses, by tag, year in review |
| Expenses    | Where it went as a map of tiles that narrow the ledger, the ledger                            | Budgets, top places, subscriptions, recurring                                                   |
| Income      | Income by month with tax stacked on top, by quarter, then all income as the tail              | Income limit, tax calendar, sources by source or currency                                       |
| Accounts    | Accounts as cards in the colour of their kind, empty ones folded, then debts                  | Bank check, currencies, savings goals, money owed to you                                        |
| Investments | Positions as cards or a returns table                                                         | Allocation once there are two kinds or currencies, schedule                                     |
| Forecast    | Assumptions, projection, then the year-by-year table across the width                         | Reach a goal, planned events, wishlist                                                          |
| Profile     | Achievements, your numbers, then recent sign-ins as the tail                                  | Financial health, sign-in                                                                       |
| Settings    | Categories with their groups folded, bank import, auto-categorisation                         | General, notifications, exchange rates, data                                                    |

The dashboard opens with a greeting for the time of day and the account's first name, over the date. Beside the net worth stand two tiles: **Safe to spend today** (`safeToSpend()` in `features/dashboard/model/safeToSpend.ts`) shares what the month leaves over the days still to go, today included, above a strip of the month's days, spent ones shaded by how much went out, today in lime and the days ahead in a faint lime. It takes the tighter of two limits: what the budgets leave, and the spending plan (the month's income, received, planned and regular income still expected, less everything spent and the bills booked ahead), so spending outside the budgets still counts; only with neither a budget nor income does it ask for one. **The month so far** draws what came in, what went out and the share kept up to today, planned entries left for later, as bars on one scale, each linking to its page. In the side column, **Coming up** dates the next two weeks (`comingUp()` in `features/dashboard/model/comingUp.ts`): unpaid taxes, money due back, planned entries, maturing deposits and regular incomes expected again (`regularIncomes()` in `features/income/model/income.ts`, left out when a planned income stands for one), overdue ones first and in the warning colour, so the 30-day cash card keeps only its balance line.

Between its hero and its cards the dashboard has a row of up to three **insights** (`InsightsRow`, from `dashboardInsights()` in `features/dashboard/model/insights.ts`), the most pressing first: a tax that is overdue or due within a week (marked paid from there, with the day it was paid), a loan past its date, a card, cash or wallet account that planned payments take below zero within two weeks, a budget over its limit or set to run out this month, an expense three times or more what is usual for its place (against at least three earlier ones from the last 90 days), a bill paid three months running or more whose last charge rose over 5%, the month before summed up through the first week of a new one, the category that moved most against the same day last month (a quarter or more, from the 7th), and a charge that repeats like a subscription. Entries posted by a schedule, split from another or left out of reports never count as unusual. Each but the tax links to the page where it is dealt with; with nothing to point out the row stays away.

The dashboard's cards can be moved between the columns and hidden in **Layout**; the order is saved with the account. The first-steps card shows its three steps as cards in the colours of their pages, numbered, side by side from tablets; it can be closed, and once its three steps are done it leaves by itself and **Layout** stops listing it. With no data at all, it is the only card on the page.

- 🎯 **One way in per empty thing.** An empty card shows a compact dashed place (`EmptyState`) with its icon on a soft lime disc and one call to action in its body, none in its header; the header gets **Add** once there are rows. A page header offers the cards that are not on the page yet, such as **Debt** and **Lent** on Accounts before there are any.
- ⚖️ **Columns that end together.** A card goes to the column whose job it shares, then the columns are checked for height: a backup sits with the app's settings, debts with the accounts.

| Part          | Treatment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🧭 Top bar    | A floating capsule over the top of the page from `md` up (`NavBar`): the round logo with the name and today's net worth from `lg`, then every page side by side as its pastel disc and its name, the open one on a pill that slides to the next page, then search, **New entry** in lime (its words from `2xl`) and the account's disc, which opens the profile, settings and signing out. The names show while they fit: `useNamesFit` lays them out for a moment on every resize and after the font loads, and where they would not fit, in any language, the pages are their discs alone, the open one in full colour, with the name in the tooltip |
| 📱 Phone bars | A transparent strip with the brand, the sync dot and a round search button, and a floating tab bar at the bottom: Home, Spend, a green add button that rises above the bar and opens a new expense on the page you are on, Accounts and **More**, a sheet with every other page as a grid of its marks                                                                                                                                                                                                                                                                                                                                                 |
| 🪟 Sheets     | A sheet from the bottom on phones, a centred dialog on small tablets and a drawer at the top right from `md` up, as tall as its fields and scrolling only past the screen, so a short form leaves no empty panel and the page stays in view beside it; actions in a footer that does not scroll, the destructive one pinned to the far start                                                                                                                                                                                                                                                                                                           |
| 🦶 Footer     | The author, the version with a link to the changelog, where the prices come from, and the source code                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### 📱 Down to 320 px

- Grid and flex columns that hold cards get `min-width: 0`, so long content wraps or truncates instead of stretching the grid; a `<select>` is as wide as its longest option unless it can shrink.
- Lists of cards with uneven heights (investment positions) use CSS columns with `break-inside: avoid` rather than a row grid.
- Long names wrap to two lines with the `clamp` mixin instead of being cut to one; figures never wrap.
- A `.data-table` wider than a phone sits in a `table-scroll` wrapper that scrolls sideways only.
- The end-to-end tests check every page for sideways scrolling at 320 px and for words cut off at 360 px, see [Testing](./testing.md#-end-to-end-tests).

## 🍱 Tiles

Content sits on flat, opaque **tiles**: white on warm paper in light, ink a step above the backdrop in dark, with a hairline ring (`--glass-hairline`) drawn as an inset shadow and a line a little brighter along the top (`--glass-top`), as if lit from above. Being opaque, a tile needs no blur, so a page of twenty of them costs nothing to scroll. Only the chrome the page scrolls under is translucent and blurred.

| Mixin          | Surface                                       | Blur  | Use                                                                   |
| -------------- | --------------------------------------------- | ----- | --------------------------------------------------------------------- |
| `glass`        | `--glass-tint-content`, opaque                | None  | Tiles: cards, the hero, its figures, insights                         |
| `glow`         | A faint lime light under the hairline         | None  | The one tile a page leads with                                        |
| `tinted-card`  | A gradient of its subject's colour (`--tint`) | None  | Account and investment cards, in the colour of their kind             |
| `glass-strong` | `--glass-tint-strong`, 86 % light, 84 % dark  | 30 px | The chrome the page scrolls under: the top bar, the phone bars, toast |
| `glass-solid`  | `--glass-tint-overlay`, opaque                | None  | Sheets, menus, the command palette and chart tooltips                 |
| `glass-el`     | `--color-fill`, a step darker on hover        | None  | Inputs, buttons, chips                                                |
| `glass-well`   | `--color-fill`                                | None  | Inset areas inside a tile                                             |

With `prefers-reduced-transparency`, the chrome turns solid and drops the blur; components need no rules of their own. Text never sits on anything translucent but the chrome, and axe checks the contrast of every page in both themes in the end-to-end tests.

Every tile's name wears the same mark: **`SubjectMark`**, the subject's icon on a 28 px disc tinted with its series colour (`SUBJECT_SLOT`), beside the name in small capitals (`tile-name`). Cards, the headline tile, the figures beside it and the dashboard's side tiles all use it, so no block goes without an icon and no icon is drawn smaller than the rest. On phones a figure's mark stands above its name, so a long name keeps whole words beside a neighbour, and the arrow to its page sits in the tile's corner.

## 🌌 Backdrop

`widgets/Backdrop` paints a fixed layer behind every page:

| Layer     | Implementation                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🌑 Base   | A flat colour, warm paper in light and ink in dark (`--color-backdrop`)                                                                               |
| 🌌 Aurora | Two soft radial gradients from above the top: lime on the right, the open page's tone on the left (`--aurora-mix`, `--aurora-mix-soft`), with no blur |
| ⠿ Dots    | A dot every 22 px (`--dot-color`), fading out down the page                                                                                           |

A one-line script in the root layout writes the open page's tone to `<html data-page>` before the first paint (`PAGE_BOOT`), the shell keeps it current, and the aurora takes that page's `--tone-*` colour. `--page-tone` is a registered `<color>` property, so moving to another page fades the aurora from one colour to the next over 0.9 s; the first load never fades, because each frame of the fade repaints the layer on the main thread. Reduced transparency hides the dots and leaves the rest.

## ⚡ Performance

Tiles are opaque, so the only blur left is the chrome's, and there is no setting for effects any more: every device gets the same look. `prefers-reduced-transparency` makes the chrome solid.

Measured with a 4× slower CPU, a mid-range phone, these are the rules the surfaces follow:

- 🧊 **Nothing on the page moves by itself.** The backdrop's aurora stays still and only fades to the next page's colour: a full-screen layer changing every frame keeps the GPU busy on an idle page and forces the blurred chrome above it to be redrawn.
- 🪟 **A blur never sits under something that changes.** A dialog someone types into, the command palette and a tooltip that follows the pointer use `glass-solid`, and the dim behind a dialog is plain black at 50 %. With two stacked blurs the palette took up to about 90 ms a keystroke; without them, one frame.
- 🎬 **Entrance animations play once.** Cards rise and charts grow on the first screen after a load; `:root[data-entered]`, set 1.3 s after the data arrives, switches them off, so another page or another month is drawn at once.
- 🎛️ **Controls answer before the cards.** Month and period switchers, the ledger search and the forecast sliders update at once and pass a `useDeferredValue` copy to the heavy cards, which redraw in the background and are interrupted by the next click.

## 🔤 Typography

Montserrat, self-hosted by `next/font` with the Latin, Latin Extended and Cyrillic subsets, from one variable file, for every word: a second face read as foreign beside it, so labels get their character from size, weight and spacing instead.

| Scale      | Mixins                                                                                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔢 Figures | `num-hero`, `num-xl`, `num-lg`, `num-md`, `num-sm`, all tabular (`tnum`)                                                                                                                                                         |
| 🔠 Text    | `page-title` (30 to 44 px, extra bold, balanced), `tile-label` (a tile's name in small, bold, spaced capitals), `card-title` (the same over a group inside a card or a menu), `section-title`, `label`, `caption`, `body-strong` |
| 📏 Sizes   | `text-xs` to `text-2xl`, each with its own line height token                                                                                                                                                                     |

## 🎛️ Design tokens

Tokens live in `shared/styles/_tokens.scss` as CSS custom properties, named like those of the other apps: one set for light, one for dark and solid panes for reduced transparency. `<html data-theme>` is `system`, `light` or `dark`; `system` follows `prefers-color-scheme` and is what a first visit and a new account start with. The theme is saved with the account and mirrored to the `finance-theme` cookie, so the server renders the right one and a reload never flashes the other.

| Group       | Tokens                                                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🖋️ Text     | `--color-text`, `--color-text-secondary`, `--color-text-tertiary`                                                                                                                                                                          |
| 🎨 Accent   | `--color-accent`, `--color-accent-strong`, `--color-accent-soft`, `--color-accent-fill`, `--color-accent-gradient`, `--color-accent-glow`, `--color-on-accent`, `--color-focus`                                                            |
| 💸 Money    | `--color-income`, `--color-expense`, `--color-warning`                                                                                                                                                                                     |
| 🧱 Surfaces | `--color-backdrop`, `--color-separator`, `--color-fill`, `--color-fill-strong`, `--color-fill-hover`, `--color-fill-press`, `--color-fill-stripe`                                                                                          |
| 🍱 Tiles    | `--glass-tint`, `--glass-tint-content`, `--glass-tint-strong`, `--glass-tint-overlay`, `--glass-solid`, `--glass-rim`, `--glass-rim-shade`, `--glass-hairline`, `--glass-shadow`, `--glass-saturate`, `--glass-blur`, `--glass-blur-thick` |
| 🌌 Backdrop | `--aurora-mix`, `--aurora-mix-soft`, `--dot-color` and the registered `--page-tone`                                                                                                                                                        |
| 🏷️ Pages    | `--tone-dashboard`, `--tone-calendar`, `--tone-reports`, `--tone-expenses`, `--tone-income`, `--tone-accounts`, `--tone-investments`, `--tone-forecast`, `--tone-profile`, `--tone-settings`, and `--tone-ink` for the icons on them       |
| 📈 Charts   | `--series-1` to `--series-14`, `--color-chart-grid`                                                                                                                                                                                        |
| ⭕ Shape    | `--radius-lg` 22 px, `--radius-xl` 26 px, `--radius-full`; `--radius-in-card` 14 px inside any tile or sheet, `--radius-in-panel` 14 px inside the chrome; `--card-padding`; control heights `--control-md` 44 px and `--control-sm` 36 px |
| 🌊 Motion   | `--ease-out`, `--ease-spring`, `--duration-fast` 160 ms, `--duration-base` 280 ms, `--duration-slow` 600 ms                                                                                                                                |

### 🏷️ Page tones

Every page has a colour of its own, for its disc in the top bar, the phone's More sheet and the aurora of the backdrop, the way every smart list in tasks has a tone. The tones are one pastel family, bright enough for the ink icon on them (`--tone-ink`) and calm enough to sit eight in a row: the open page's disc is full, the others are a faint tint of their tone with the icon in it, and a disc fills in under the pointer. They are decorative, so the page name is always its accessible name, and forced colours draw them as outlined circles.

| Page      | Tone       | Page        | Tone     |
| --------- | ---------- | ----------- | -------- |
| Dashboard | Lime       | Accounts    | Sky      |
| Calendar  | Apricot    | Investments | Lavender |
| Reports   | Periwinkle | Forecast    | Amber    |
| Expenses  | Coral      | Profile     | Pink     |
| Income    | Mint       | Settings    | Silver   |

### 🟢 One brand colour, split by job

Lime, `#c6f35e`, on ink; the logo keeps its own green:

| Token                                | Job                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `--color-accent`                     | Ink: a deep olive on a light page, the lime itself on a dark one, ≥ 4.5:1 |
| `--color-accent-fill`                | Surface: lime in both themes, for primary buttons and today               |
| `--color-on-accent`                  | What goes on top of that surface: near-black ink                          |
| `--color-income`                     | The same as `--color-accent`: one hue, one meaning                        |
| `--color-expense`, `--color-warning` | Coral and amber, reserved status colours; never doubled as a chart series |

### 📏 Rhythm

- 12 px between tiles, 14 to 16 px from `sm`, in every grid on every page; tiles pad 16 px (`--card-padding`), 20 to 22 px from `sm`, and whatever sits inside that padding rounds with `--radius-in-card`.
- In a form a segmented control spans the form, lined up with the fields; in a page or card header, a toolbar or beside an amount it is as wide as its words (`fit`, the default for the small size), every segment as wide as the widest. Both sizes use the same 13 to 14 px text, so a small one reads as the same control. A currency is always picked by its sign, `₴ $ €` (`currencyOptions`), with its code as the radio's name for screen readers, the way amounts are written everywhere.
- The command palette shows pages on their own pastel discs, as the top bar does, and actions on grey ones.
- Every dropdown is the app's own list (`OptionPicker`, a combobox with a listbox): `Select` takes its options written as for a native select and draws them the same way, so a category, an account's kind and a month open the same searchable list with the same chevron on a small disc.
- A figure tile beside a headline opens the page that owns its subject, unless that is the page it is on: expenses go to Expenses, income to Income, the net worth now to Accounts. A dashboard card that sums up a page names it in its header (`CardLink`, labelled with the page's name); one whose rows already open their pages has no header link. A card's header actions stay together as one group: beside the title while they fit, otherwise one row under it, never split over two lines.
- A list gets search, sorting and filters from four items (`LIST_TOOLS_AT`); a shorter one reads at a glance, so its card shows only the rows.
- Two control heights, and every control takes one of them exactly: 44 px (`--control-md`) for fields, pickers, segmented controls and buttons in forms and sheets, 36 px (`--control-sm`) in toolbars and card headers, where the pills, the sort select, **Filters** and **Add** share it. Inputs get a fixed height rather than a minimum, so a field never ends up 2 px taller than the segmented control beside it on a phone, where the text grows to 16 px. Icon buttons extend their hit area past the visible circle.
- Text in controls: 15 px in a field or picker, 13 px in a small one, 14 px semibold in buttons and segments, and 16 px in every field on phones so iOS never zooms in.
- Inside a card everything is inset 12 px: tiles and panels pad 12 px all round, rows 8 px by 12 px, group heads 6 px by 12 px, so text in a tile, a row and a heading starts on one line.
- A card's icon sits in a 28 px round disc, tinted, edged and inked in its subject's series colour (`SUBJECT_SLOT`), beside its name in small capitals with a plain subtitle under it; an icon without a colour sits on a quiet fill. Heroes use the same disc. A card's name takes the room and its subtitle wraps to two lines, so **Add** stays beside it.
- Placeholders show the shape of an answer, never something that looks typed: money fields show `0`, examples read "e.g. …" through `common.example`, searches end in "…", and an empty date is as faint as a placeholder until it has the focus.
- Every sheet whose subject is an amount leads with it large on a tile of its own (`MoneyField hero`): an entry, an income, a budget's limit, a subscription's or a recurring rule's price, a debt's balance, an account's opening balance, an investment's principal, a wish and a planned event. The tile's name and the currency signs share its top row and the figure, as big as a page's headline, fills the rest. Every form follows one order: what kind it is (a segmented control or a list, when the kind changes the fields), the name with its emoji on a disc before it (`NameField`), the amount tile, where it belongs (category, account), when (dates side by side), extras, and the note last. Short fields pair up in a `FormRow`, the same in every form: the account beside the charge day, the start beside the end, the date beside the note. A section that is empty until asked for starts as one quiet line, such as **Split across categories** under an entry's category, and an account without a bank picks its emoji from the disc beside the bank picker instead of a field of its own.
- An amount and its currency are one **`MoneyField`**: the number takes the row and the currency sits beside it as `₴ $ €`, the way quick add has it, so no form spends a second row on three letters. It is also a calculator: a sum such as `120+45−10` or `3×85` (`parseAmount()` works out `×` and `÷` first) shows `= 155 ₴` under the field and is replaced by its result once the field is left.
- A new entry offers the entries typed most often as **Frequent** chips over its fields (`frequentEntries()` in `features/transactions/model/frequent.ts`): typed by hand at least twice in the last 90 days, not posted by a schedule; a chip fills the category, note, account and currency, and the amount when the last two matched.
- **Money flow** (`FlowCard` in Reports) is a three-column band chart: the period's income sources, the pool they run into and the categories it ran out to, plus what was kept or drawn from savings. Parts under 3% gather into **Other**, the names keep 38 px apart and inside the drawing (`flowLayout()`), and the bands take the soft colour of their outer end. An icon is one **`EmojiPicker`**: the chosen emoji and **Change**, with the grid of choices unfolding only on request.
- Money reads the same everywhere: whole amounts from 1,000, cents only when there are any (`12.50 ₴`, never `12.5 ₴` or `99.00 ₴`), short forms (`20K ₴`) in tight spots, and full cents only on balances. The hryvnia sign is held to its amount by a no-break space, so a line never ends on a bare number.
- Breakpoints: `sm` 40 rem, `md` 48 rem, `lg` 64 rem, `xl` 80 rem, `2xl` 96 rem, through the `from()` and `below()` mixins.

## 📋 Lists, tables and toolbars

Every list and table shares one look, defined once as mixins in `shared/styles/_lists.scss`:

| Mixin          | Where                                         | What it does                                                                                                   |
| -------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `rows`         | A list's wrapper                              | Rounded rows split by hairlines inset 12 px from each side, like iOS lists                                     |
| `rows-head`    | The column header above a list                | Small uppercase labels over a hairline                                                                         |
| `group-head`   | A day or month heading inside a list          | The label over a hairline, and the group's total once it holds two rows or more                                |
| `total-row`    | The sum under a list                          | A green-tinted rounded bar                                                                                     |
| `data-table`   | A real `<table>`                              | The header on a soft rounded band in sentence case, rows split by hairlines, rounded on hover, a tinted footer |
| `table-scroll` | Around a table that may be wider than a phone | Scrolls sideways only                                                                                          |

- Rows are split by hairlines drawn as a background, inset to the text, so a row's own fill and corners stay its own; a heading sits over a hairline too. Day and month headings in the ledger and the income list stay under the bars while their rows scroll by (`sticky-head`). A tappable row adds the `row-tap` mixin, whose hover fill has the row's radius.
- A switch always comes as a **`SwitchRow`**: its name and what it changes on the left, the switch on the right edge, the same in cards, sheets and settings.
- A primary button that cannot be pressed yet turns a plain grey capsule, never a dimmed lime one.
- A row's own buttons, such as a category's add and delete, wait out of sight until the row is hovered or focused on a device with a pointer; on touch they stay.
- A list card opens with a **`SummaryPanel`**: the headline figure, what it is measured against, and a meter or a caption, before its filters. A unit sits beside its figure through `Unit` ("/mo").
- A record's key facts are `Facts` and `Fact` tiles, two per row, with the long one across the full row; a position card puts three in a row from `md`, so it stays short.
- A list that acts on several rows at once has a **select mode** (the ledger's **Select**, beside its CSV download over the rows): rows become checkboxes, and a solid bar pinned to the bottom of the card holds the count, select all and the actions.

`Toolbar` is a wrapping flex row whose children declare a flex basis instead of a width: `SearchInput` grows first (`flex: 999 1 14rem`), a `ToolbarSlot` with a select takes 10 rem and `SortSelect` 11 rem, so rows re-flow predictably from 320 px to a wide screen. `FilterPills` wrap instead of scrolling sideways. Filters a list rarely needs fold behind a **Filters** button that counts the ones on (the ledger's category, account, tag and timing; on phones its period too, so the toolbar keeps to three rows). The sort key and direction of each list are kept per device through `usePersistentState`.

## 📈 Charts

Every chart is hand-drawn SVG in `shared/ui`, with no chart library:

- 📊 **`MonthlyColumns`**: income and expenses side by side, or income alone with any tax stacked on top. The columns start at the first month with data (six at least), and the period tabs offer only the periods the history fills, so a new account sees wide columns instead of a row of empty months.
- 🏃 **`PaceLines`**: a month's running total against the month before.
- 📉 **`BalanceLine`**: a projected balance day by day with the zero line and its lowest point marked (cash ahead).
- 🍩 **`CategoryBreakdown`**, **`SplitBar`**: shares of a whole as one bar, each slice with its label, the same for categories, accounts and currencies.
- 🧭 **`SectionNav`**: chips to a long page's sections in a capsule that stays under the bars, marking the section being read (Settings).
- 🧱 **`CategoryMap`**: where the month's money went on Expenses as a map of tiles, each as large as its share (`squarify()` in `shared/lib/treemap.ts`): the series colour itself with ink on it in dark, a tint of it with the text's ink in light. A tile shows its name, share and amount when it has the room, the amount alone when smaller (shortened to `2K ₴` when the full one would not fit), its icon alone when narrower still, and nothing when tiny, with every figure in its hidden table. On Expenses a tile is a toggle that narrows the ledger to its category while the other tiles fade (`onChoose`); on the dashboard it is a link to Expenses narrowed the same way (`hrefOf`, `/transactions?category=…`).
- 📶 **`BarRow`**: a few columns side by side with their figure on top, the one that matters in bold and the rest stepped back, negative ones hanging below the line; the kept share by month and spending by weekday use it.
- 🗻 **`StackedArea`**, **`SparkArea`**, **`HeroTrend`**: trends over months. `StackedArea` stacks two series as bands under a single line on their total, so two close series never read as one thick line, and can shade a range behind them (`rangeLabel`, the forecast's scenario spread).

The categorical slots avoid the green and red bands entirely, because in this app those two mean income and overspend. The hues, their steps and their order came out of an enumeration scored by a colour-blindness validator: the worst neighbouring pair is ΔE 12.1 in light and 10.6 in dark under protanopia and deuteranopia, 20.4 and 19.1 under normal vision. Gridlines are translucent (`--color-chart-grid`), so they sit on the glass rather than on a fixed grey.

> [!IMPORTANT]
> No eight-hue palette clears those floors across all 28 pairs, so every series is also labelled directly and separated by a 2 px gap: identity never rests on hue alone. Income against expense charts use the status colours, not series slots.

Every chart carries its figures as a visually hidden table (`ChartTable`), and its tooltip (`ChartTooltip`) is solid, so it can follow the pointer without a blur.

## 🌊 Motion

| Interaction           | Motion                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🃏 First screen       | Cards rise in a short stagger (`rise`, `stagger`), once per load                                                                                                                                                                                                                                                                                                                                                                                       |
| 🧭 Navigation         | A view transition per page (`<ViewTransition>` keyed by the path in `AppShell`): the old page fades in 140 ms, the new one settles 10 px up in 320 ms. Nothing is morphed from one page into the next: tiles of different sizes and words stretched while they glided                                                                                                                                                                                  |
| 💊 Open page          | The pill under the open page slides to the next one in the top bar and in the phone's tab bar (`share="pill-move"`, 340 ms, easing out without a bounce); the names never fold or unfold, so nothing beside the pill moves                                                                                                                                                                                                                             |
| 🔢 Headline figures   | A hero's figure rolls to its new value in 520 ms when the month, period or currency changes (`CountUp`), never on the first draw                                                                                                                                                                                                                                                                                                                       |
| 📊 Charts             | Bars grow and lines draw in (`chart-bar`, `chart-line`), the safe-to-spend strip rises day by day (`strip-in`), the month's bars slide out (`bar-slice`) and the category map settles tile by tile, the largest first (`cell-in`), once per load                                                                                                                                                                                                       |
| 🃏 Tiles              | Figures beside a headline, account cards and the rows of Coming up rise one after another (`stagger`); cards further down are simply there when scrolled to, nothing fades in under the reader; the top bar deepens its shadow as the page scrolls under it (`condense-on-scroll`); loading outlines shimmer (`shimmer`); a tile that opens a page lifts 2 px under the pointer (`glass-hover`), and the account menu grows out of its disc (`pop-in`) |
| 🪟 Sheets and dialogs | The dim fades in and the panel slides up on phones or scales in from `sm` (`overlay-in`, `sheet-panel`); closing, a frozen copy of the panel slides down or sinks away while the dim fades (`ghostOut` in `shared/lib/ghost.ts`), so pages can simply unmount a sheet                                                                                                                                                                                  |
| 🍞 Toasts             | A toast rises on a spring and a replaced or dismissed one sinks away (`toast-in`, `toast-out`)                                                                                                                                                                                                                                                                                                                                                         |
| 📂 Popovers and folds | Pickers' lists grow out of their button (`pop-in`); the ledger's folded filters and a category's subcategories settle in as they open (`unfold`)                                                                                                                                                                                                                                                                                                       |
| 🌗 Theme              | A change of theme crossfades the whole page through a view transition (`crossfade` in `shared/lib/crossfade.ts`)                                                                                                                                                                                                                                                                                                                                       |
| 📏 Meters             | Progress bars grow from the start on the first screen and ease to new values after                                                                                                                                                                                                                                                                                                                                                                     |
| 🔄 Saving             | The sync dot pulses while a save is under way (`pulse`)                                                                                                                                                                                                                                                                                                                                                                                                |
| 🖱️ Hover and press    | Edges brighten and fills step in 160 ms; page discs fill in their tone; tabs shrink a little on a press with `--ease-spring`, the spring curve of the other apps                                                                                                                                                                                                                                                                                       |

`prefers-reduced-motion` turns every animation and transition off, view transitions included; the leaving copies, the rolling figures and the crossfades check it before they start.

## ♿ Accessibility

- Every icon-only control has an accessible name; decorative marks, the page tones included, are hidden from assistive technology.
- Segmented controls and pill groups are radio groups: one tab stop for the group, arrows to move, <kbd>Home</kbd> and <kbd>End</kbd> to jump.
- Focus rings use `--color-focus`, on `:focus-visible` only, and follow the shape of the control, capsules included.
- Colour is never the only signal: badges carry text, progress bars carry numbers.
- The visually hidden table of a chart sits in a hidden wrapper, not on the table itself: tables ignore `overflow: hidden`, and a hidden table with many rows would stretch the page.

More in [Accessibility](./accessibility.md).

## 🖼️ Iconography and logos

The logo is minimal: the hryvnia sign of Montserrat Bold, the app's own font, in the ink of the primary buttons (`#0b0d05`) on their lime (`#dcfb8a` to `#a3dc2c`), with a soft sheen and a lime light under it in the top bar, on a disc, round like every page's mark beside it; the sign's ink is centred in the disc. The maskable PWA icon and the Apple touch icon stay full squares, since the system rounds them itself. The glyph is kept as a path, so it looks the same where the font is not loaded. `shared/ui/Logo` draws it in the app and `src/app/icon.svg` for browsers; `favicon.ico` (16, 32 and 48 px), the PWA icons, the maskable icon and the Apple touch icon are rendered from it. The service worker answers `/icons/` from its cache and refreshes them behind it, so an installed app picks up a new icon on the next start.

`Icon` draws a fixed set of line icons from `shared/ui/Icon/icons.ts`. Every mark is round, whatever it holds: an icon, an emoji, a monogram or a logo, in lists, cards, the command palette and forms alike. Banks, exchanges and games get their own marks: `RemoteLogo` takes an ordered list of sources, falls back through them on error, ignores images under 24 px and finally renders its fallback (`Monogram`, an emoji or an icon). Brand and game logos come from `public/brands` and `public/games` first and from favicon services second. Country flags for the language picker are prerendered SVGs served by `/flags/{code}`.

## 🖨️ Printing

A printed page drops the top bar, the phone bars and the backdrop (`hide-in-print`), shows cards as plain white panes with a hairline border (`print-plain`) and keeps each card whole across pages. It always uses the light theme: `usePrintTheme` switches `data-theme` for as long as the page prints and restores it afterwards. Controls that mean nothing on paper, such as the period switch on Reports, are hidden too.

> [!TIP]
> When adding a screen, copy an existing feature folder: a page with `PageHeader`, `PageHero` and `Split`, one folder per card, toolbars inside the card they filter, and one folder per editing sheet, mounted with a `key` so it always opens with a fresh form. A new page also gets a tone in `--tone-*` and in `PageTone`.
