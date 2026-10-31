# ✨ Features

Finance keeps track of money in more than one currency: income, spending, subscriptions, accounts, debts and investments in ₴, $ and €, with net worth that builds up by itself and a forecast years ahead. Every page follows the same skeleton, see [Design](./design.md#-layout).

## 📊 Dashboard

- 🚀 **First steps** for a new account: add accounts, log income, record an expense, each ticked off as it happens, with a way to import a bank statement instead. The card leaves by itself once all three are done.
- 💎 **Net worth** over the last year, from **daily snapshots** the app records by itself, in every currency you use.
- 📆 **This month**: income, spending, net flow and savings rate so far, set against last month up to the same day.
- ⚡ **Quick add**: an entry in a few taps, without leaving the page, with the entries you type most often one tap away.
- 🚨 **Heads-up**: the overview warns when planned payments would take a card below zero in the next two weeks, when an expense is far above what you usually spend at that place, when a regular bill costs more than in the months before, and when imported operations wait to be reviewed.
- 🗓️ **Month in review**: through the first week of a month, what the month before brought in, spent and kept, and where most of it went, linking to its report.
- 🧾 **Recent entries**: the last five logged up to today; tap one to fix it on the spot.
- 📊 **Cash flow** month by month and **spending by category** with the meter of every budget.
- 🔭 **Cash ahead**: what your liquid accounts will hold each day of the next 30 or 60 days, and the day they would dip below zero.
- 🗂️ **Allocation**: net worth by holding or, with a tap, by currency with today's rates; then **subscriptions** and **progress**.
- 🧱 **Spending by category** tiles open Expenses with the ledger narrowed to that category.
- 🧩 **Layout**: the cards below the headline can be moved between the columns and hidden; the arrangement is saved with the account, so every device shows the same overview.

## 💸 Expenses

Entering is quick: the entries you typed at least twice in the last 90 days wait as **Frequent** chips over the form and fill it in one tap, with their amount when it repeats, and every amount field is a **calculator** (`120+45−10`, `3×85`) that shows what the sum comes to and keeps the result. An entry can be **left out of reports and budgets**, for money you get back or a one-off, while still moving its account's balance.

A month-by-month ledger with search and type filters up front and the category, account, tag and timing filters folded behind **Filters**, which counts the ones on. It shows the expenses until you pick another kind (incomes have their own list on Income), and remembers the choice on the device. Days are grouped, with a day's net when it holds more than one entry, beside the month's spending per day and a pace chart of the running total against the month before. While a month runs, every change is measured against the month before up to the same day, and **On pace for** adds the month's bills once to everyday spending at today's pace, so rent on the 1st is not counted thirty times. A tap on a tile of **Where it went** narrows the ledger to that category and a second tap lets go.

- 🔁 **Recurring rules** post an entry weekly, monthly, quarterly or yearly between a start and an optional end month. Rules that book a whole budget as spent every month are pointed out, with an offer to stop them. Any entry can be **copied** or **made recurring** from its sheet.
- 💳 **Instalments**: a purchase paid off in equal parts, with how many payments are made and what is left to pay.
- 📺 **Subscriptions** with a real lifetime: weekly, monthly, quarterly or yearly, billed from one month until another, so services that no longer bill drop out instead of lingering. Charges that repeat monthly in an imported statement are offered as new subscriptions.
- 🎯 **Budgets** per category, subcategories included, for a month or for the whole year. A monthly budget can **carry over** last month's unspent money, and both warn on the day the pace would run them out. A new limit can start from what the category usually spends, and what one budget has left this month can **move** to another.
- 📍 **Top places**: where the month's money went by the note on each expense, the costliest first, with how often you paid there. A tap finds that place's entries in the ledger.
- 🏷️ **Tags** across categories (`#trip`, `#work`), with a filter and search.
- ✂️ **Split one purchase** across several categories, such as a supermarket receipt with food and household goods.
- 🧾 **Receipt photos** on any entry, shrunk in the browser and stored sealed.
- 📷 **Receipt QR**: a photo of the QR code on a Ukrainian fiscal receipt fills in the sum, the day and the category of that shop's last entry, and the same receipt is never booked twice.
- 🤝 **Paid for others**: mark part of an expense as someone else's and only your part counts as spending; theirs goes to **Owed to you**.
- ☑️ **Bulk edit**: tick several entries to change their category, add a tag or delete them at once.
- 🧠 **Learns from corrections**: move an imported entry to another category and it offers to file that merchant there from now on, and to move its earlier entries too. Renaming one does the same for the name, so `SILPO 1234 KYIV` arrives as Silpo next time.
- 👀 **To review**: operations the bank brought in wear a **New** badge until you open them or confirm them all at once from the chip above the ledger.
- 🔖 **Saved views**: a search with its filters, kind and period kept under a name above the ledger, one tap away.
- 📤 **Export** the entries on screen, with every filter applied, as a CSV in the format your spreadsheet expects.

More in [Budgets and schedules](./budgets-and-schedules.md).

## 🧾 Income

Salary, freelance, interest, dividends, sales or gifts, each landing in a real account.

- 📆 **Next payday**: an income that came three months running on about the same day, within 15%, is expected again, with the day and about how much.
- 〰️ **Stability**: how far the last full months stray from their average, as ±%, steady up to 20%.

- 🧮 A **day-rate calculator** for contract work: `days × rate + premium + compensations - cut-offs`.
- 🏛️ **Tax per entry**: FOP groups 1, 2, 3, 3 with VAT and 4, the general system, or your own regime, with the breakdown shown while you type and stored with the entry.
- 📏 A **limit card** that tracks this year's taxed income against the group's annual ceiling.
- 📊 **Income by month** with the tax withheld stacked on top, so each column's height is the gross.
- 🗓️ A **tax calendar** for FOP groups 1 to 3, once the regime is set in **Settings → Taxes**: declarations, single tax, military levy, ЄСВ and VAT with their deadlines. Ticking one off, or a whole quarter, asks the day each payment was paid, each on its own day and books it as an expense under taxes only if the tax was not already taken off your income.
- 🧮 A **quarterly summary**: income, tax and ЄСВ per quarter, with foreign-currency income converted at the **NBU rate of the day it arrived**, the running totals a group 3 declaration asks for, and the **income book** as a CSV.
- 📚 **Figures per year**: the minimum wage and subsistence minimum behind every fixed amount and limit are kept for each year, so last year's income is taxed by last year's rules.

More in [Taxes](./taxes.md).

## 🏦 Accounts

Every account with its balance in all the currencies you use, savings goals and debts, how many months of spending the emergency fund covers and how the money splits by account type or currency.

- 🗄️ **Archive** an account you no longer use: it leaves the pickers but keeps its history and its balance.
- ➕ **Balances are derived, never typed over**: the opening balance plus everything booked to the account. Each account's card draws its balance over the last six months, and the headline draws the total.
- ✅ **Checked against the bank**: accounts linked to Monobank show whether they match the bank's balance, and one tap books the difference.
- 🪙 **Cryptocurrency accounts** hold several of 24 coins at once, priced live from CoinGecko.
- 🎮 **Game item accounts** for CS2, Dota 2, Team Fortress 2, Rust, PUBG or a game of your own.
- 🎯 **Savings goals** in one card: overall progress, the goals closest to done, and what it takes each month to meet every deadline. A goal can be an account's own or stand alone, counting money put aside by hand and the balances of the accounts you pick.
- 💳 **Credit card grace period**: a card with a credit limit says how much of last month's debt to pay back by the month's end to pay no interest, in Coming up and in the morning notification.
- 📊 **Allocation over time**: what the assets were made of at the end of each month, by kind of account or by currency.
- 💳 **Debts** with payoff dates, interest left and monthly payments, and a **payoff planner**: add an extra amount, pick the dearest or the smallest debt first, and see how much sooner and cheaper it gets.
- 🤝 **Money owed to you**: what you lent, to whom, when it is due and how much came back; it counts towards net worth.
- 🫥 **Empty accounts** fold into one row at the end of the list until you ask to see them.

More in [Accounts and assets](./accounts-and-assets.md).

## 📈 Investments

Deposits, bonds, funds, stocks and cryptocurrency on their own page: totals, where they head over the next year, allocation by type, and the positions as detailed cards or a compact returns table.

- 🧠 **Every position knows how it earns**: deposits capitalise or pay out, bonds pay coupons, funds pay dividends, stocks and cryptocurrency grow in price.
- 🏢 **Inzhur funds** (REIT, Energy, MilTech) pull their NAV, forecast yield and payout type from the published fund pages.
- 📅 **Next 12 months**: what your investments are expected to add over the coming year, beside the next term to end and what it comes to.
- 🗓️ **Schedule**: the monthly top-ups going in and the interest and dividends coming out, the positions that mature next, and **reinvest or withdraw** for any whose term has ended.

More in [Investments](./investments.md).

## 🔮 Forecast

Savings and investments projected 1 to 40 years ahead: cautious, base and optimistic scenarios, one-off planned events in any currency (added and changed in a sheet, like wishes), optional debt subtraction, a goal with the date you reach it, and a year-by-year table. Growth comes from what you hold, the monthly contributions set on your investments and what you usually keep each month, so nothing has to be typed twice.

A **wishlist** sits beside it: what you want, what it costs, how many months of your usual surplus it takes and, once you give it a month, a planned event in the forecast. More in [Forecast](./forecast.md).

## 📅 Calendar

The month as a grid: every day's spending shaded by size, entries and tax deadlines as coloured dots, the month's net building up day by day with its lowest point, the month's key dates (tax deadlines, maturing investments, money due back, the end of a credit card's grace period, wishlist plans; a tap opens that day), each week's spending against the busiest one, and the day you pick listed in full, with a button that adds an entry on exactly that date. The headline names the busiest day with its largest entry and counts the **no-spend days** so far. Under the grid, **by weekday** shows what a day of each weekday costs on average over the last 12 weeks, the dearest one named.

## 📑 Reports

Any period, a month, a quarter, a year or a range of months you choose, against the one before or the same one a year earlier (a period still running counts up to today and is set against the other up to the same day): a **money flow** that draws each source of income running into the categories it was spent on and what was kept (or what was drawn from savings), categories compared side by side, each category's trend as a small chart, **fixed and flexible** spending (what recurring rules and subscriptions took, and their share of income), **spent by account** once more than one account paid, the largest expenses, spending by tag and a year in review. The comparison downloads as a CSV, and **PDF** prints the page without the navigation and always in the light theme. **Kept each month** bars the share of income each month left over after spending, with the average.

## 🧑‍🚀 Profile

- 🪪 **Your details**: name, occupation, location, birthday, website, a picture and a few words about yourself, changed in **Edit profile**.
- 🏅 **Levels and XP** for tracking consistently and finishing months in the plus, and **70 achievements** in seven groups.
- ❤️ A **financial health score** from seven parts (savings rate, emergency fund, debt load, budget discipline, stability, diversification and investing), each with an explanation and a tip that links to the page where you would fix it.
- 🔐 **Sign-in**: set or change the password, link Google, add **passkeys**, turn on **two-step verification** with any authenticator app and eight recovery codes, and **sign out every device** at once. The password row says when the email is verified.
- 🕵️ **Recent sign-ins** lists where the account was opened, and a sign-in from an unfamiliar device sends a notification.

More in [Gamification](./gamification.md) and [Security](./security.md#-sessions-and-passwords).

## ⚙️ Settings

- 🌍 **General**: language, base currency, theme and keyboard shortcuts.
- 🧾 **Taxes**: no tax by default, or a sole proprietor's group, the general system or your own rates, with ЄСВ on or off, and what the regime takes.
- 🗂️ **Categories**: the whole tree with subcategories, icons and colours; groups start folded, and a search opens the ones it finds.
- 🏦 **Bank import**: Monobank directly, with your personal token sealed on the server, or any bank's CSV statement. Every row gets a category from your own rules and the merchant code, and what is already in the ledger is skipped. Transfers between your own cards and jars become one transfer, cash withdrawals move money to your wallet, and a payment you had planned fills in the plan instead of doubling it. On a public `https:` address, Monobank can also send each new operation as it happens. Exports of Monefy, Spendee and Wallet load like a statement, with their categories and accounts. More in [Bank import](./bank-import.md).
- 💱 **Exchange rates and prices** refresh by themselves every hour from Monobank (with the official NBU rate as a fallback) and CoinGecko. More in [Money and currencies](./money-and-currencies.md).
- 🔔 **Notifications** bring a short note each morning to the devices you switch on: payments and income planned for today and tomorrow, taxes coming due and money someone should return. With automatic Monobank import, each new operation arrives as a note too, and a budget speaks up at 80 % and 100 %. A weekly or monthly **summary** of what was spent and earned can come too. More in [Notifications](./notifications.md).
- 📅 **Calendar**: a private link Google Calendar or Apple Calendar subscribes to, with planned payments and income, tax deadlines, money due back and grace periods.
- 💾 **Data**: download everything as a JSON backup and read one back in, after a question.
- 🧯 **Server errors**: the latest failures of the server, for the owner only.

## ⌨️ Everywhere

- 💾 **Nothing typed is lost.** An edit made without a connection waits in the browser and is sent when the app can reach the server again, even after the page was closed. Two devices editing different records both keep their work, and destructive actions carry an undo.
- 🙈 **Hide amounts** with the eye in the top bar or <kbd>H</kbd>: every figure turns into dots on this device, chart scales and the progress of money achievements too, for using the app where others can see the screen.
- ⌨️ <kbd>Ctrl</kbd>+<kbd>K</kbd> (<kbd>⌘</kbd>+<kbd>K</kbd> on a Mac) opens a **command palette**: jump to any page, account or position, start a new entry, switch the theme, or find an entry by its note, category, tag or amount.
- 📲 **Installable** on a phone or a computer, with shortcuts to add an expense or income from the icon, and an offline page in your language when the network is gone.
- 🖨️ **Printable**: every page prints without the navigation, in the light theme.

## 🌍 Ten languages

English, Ukrainian, Czech, German, Spanish, French, Italian, Dutch, Polish and Portuguese, including money, dates, plural forms and exported spreadsheets, with the sign-in page already in your language. More in [Localization](./i18n.md).

## ♿ Accessibility

Landmarks, a skip link, native dialogs, real radio groups, a combobox in the command palette, a hidden table behind every chart, reflow down to 320 px, and support for reduced motion, reduced transparency and forced colours, checked with axe in every build. More in [Accessibility](./accessibility.md).
