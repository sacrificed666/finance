# 🗓️ Budgets and schedules

## 🏷️ Categories

Categories have two levels: parents and children. The defaults ship with 57 categories grouped into housing, food, transport, health, shopping, wants, education, charity, taxes and income families.

- Charts and budgets roll children into their parent (`rollupToParents` in `features/data/model/finmath.ts`).
- A budget on a parent counts everything spent in its children too. When a child has a budget of its own as well, the month's totals count only the parent's, so nothing is added twice (`budgetTotals` in `features/transactions/model/budgets.ts`).
- Settings → Categories shows the tree with collapsible parents, a search box, a per-row **+** to add a subcategory and usage counts.
- **Restore default categories** adds anything missing and links known children to their parent; it never renames or deletes what you already have.
- The defaults are written to the database with the first save, so adding or renaming one category never leaves the account with that one alone.

> [!TIP]
> Category names you never edited are translated with the interface. Rename one and your own wording is kept in every language.

## 🎯 Budgets

A budget is a monthly or yearly limit for one category in one currency (`period`, monthly unless it says `"yearly"`). The Expenses page shows progress bars per budget, the total left for the month, and marks anything above 100%.

> [!NOTE]
> Monthly budgets are evaluated per calendar month, including transactions in child categories and subscriptions posted in that month. Yearly ones count the calendar year from January up to the month shown (`budgetSpent` in `features/transactions/model/budgets.ts`).

- **Rollover.** Turn on "Carry over what's left" and whatever the budget did not use last month is added to this month's limit (`budgetLimit` in `features/transactions/model/categories.ts`). Only one month carries over, so an old surplus never piles up; an overspent month carries nothing. Yearly budgets never carry over.
- 💡 **A limit to start from.** The budget sheet offers what the category spent on average over the last three full months, or over the last twelve for a yearly budget, rounded up to a hundred (`suggestedLimit`).
- 🔀 **Moving the rest.** What a monthly budget has left this month can move to another monthly budget, converted when their currencies differ, for this month only. The amounts sit in `moved` by month, so the giving budget's limit shrinks and the other's grows, and both bars say how much moved (`moveBetweenBudgets`). A carrying budget carries its moved money on with the rest.
- **Pace.** From the third day of the current month, a budget still under its limit shows the day it would run out if spending carried on at this month's rate. A yearly budget does the same over the year, from its fourteenth day on.
- 📆 **Yearly budgets.** For costs that come in lumps, such as travel, gifts or clothes. They sit under the monthly ones in the list with "for 2026" under the bar, warn at 80% and 100% like the others, and stay out of the month's totals and the monthly achievements. Their categories' spending is not counted as spending outside budgets either. Safe to spend takes a share of each: what is left of the year's limit before this month, over the months to go including this one, against what the category spends this month (`yearlyShare`).

## 🔁 Recurring rules

A recurring rule posts a transaction on a chosen day, between `startMonth` and an optional `endMonth`. The store materialises them after every load, so the ledger always contains real entries you can edit or delete individually.

| `period`    | Books                                               |
| ----------- | --------------------------------------------------- |
| `weekly`    | Every 7 days from the chosen day of the start month |
| (none)      | Every month on the chosen day                       |
| `quarterly` | Every third month from the start month              |
| `yearly`    | Once a year in the start month                      |

Monthly sums (the recurring card's flow, `₴/mo` on subscriptions) count a weekly amount as 52 a year and a quarterly one as 4 (`perMonth` in `features/data/model/frequency.ts`).

- 🧾 **Make recurring.** An entry's sheet has "Make recurring": it keeps the entry's edits and opens a new rule filled in from it, so the frequency, day and end can change before saving. The entry becomes the rule's booking when the rule has one on its day or month; past bookings between the entry and today are skipped, since they are already in the ledger or never happened (`startRuleFrom` in `features/transactions/model/recurring.ts`). "Copy" beside it opens a new entry with the same fields, dated today, without the bank's mark or photos.
- 💳 **Instalments.** "Pay in instalments" turns an expense rule into a purchase paid off in equal parts: type the purchase total and the number of payments (2 to 120), and the rule books total / count each month, quarter or year until the last payment (`instalment: { total, count }`, the end month follows from the count). The row shows how many are paid and what is left, and the debts card on Accounts lists every instalment still running. Weekly instalments are not offered, since a schedule ends on a month.

| View   | Meaning                              |
| ------ | ------------------------------------ |
| Active | Runs in the month you are looking at |
| Ended  | Its last month has passed            |
| All    | Everything, including future rules   |

### 📌 Plans versus payments

A rule that posts exactly its category's budget every month (Food 7 000 with a Food budget of 7 000) is a plan booked as spending: the budget always reads 100% and real spending never shows. The recurring card names such rules and opens a sheet to stop them from this month on (`plansBookedAsSpending` in `features/transactions/model/categories.ts`, `stopSchedules` in `schedules.ts` beside it). Earlier months keep their entries, and bills (rent, utilities, internet, insurance, loans, taxes and subscriptions, recognised by category id or name) start unticked, since posting those at their budget is usually the real payment.

## 📺 Subscriptions

A subscription is a recurring service with a price, a billing day and a lifetime:

```ts
startMonth        first month it bills
endMonth?         last month it bills (empty = open-ended)
period            "weekly" | "monthly" | "quarterly" | "yearly"
```

A yearly plan charges its full price on its billing day of the start month, every year, so the account balance moves when the bank's does; a quarterly one every third month and a weekly one every 7 days. Totals per month (`₴/mo` on the cards, the share of spending) count them as their monthly average.

Status is derived, never stored twice:

| Status   | Rule                                                     |
| -------- | -------------------------------------------------------- |
| Active   | `startMonth ≤ month` and (`endMonth` empty or `≥ month`) |
| Upcoming | `startMonth > month`                                     |
| Ended    | `endMonth < month`                                       |
| Paused   | Legacy entries switched off in an older version          |

The list defaults to **This month**, so services that no longer bill do not clutter the view; pills switch to upcoming, ended or all.

### 💡 Suggested subscriptions

`suggestSubscriptions` in `features/import/model/import.ts` looks for a merchant charged once a month for at least two months in a row, at about the same amount (within 10%) and day (within four days), that no subscription names yet. Bills such as rent, utilities, insurance, loans and taxes (`looksLikeBill` in `features/transactions/model/categories.ts`) are left out: they repeat, but they are not services you subscribe to. Up to three show at the top of the card; **Add** opens the sheet filled in and starting the month after the last charge, so the charge already booked is not planned twice. Dismissed suggestions are remembered in the browser.

> [!IMPORTANT]
> Stopping a subscription means setting the month it stopped, not flipping a switch. The sheet has an **End with \<month\>** button that fills the "Until" field with the current month, which keeps history intact: past months still show what you paid.

> [!NOTE]
> Subscriptions created in an older version could be switched off. Those show a **Paused** badge and a **Resume** button in the sheet, so old data still behaves predictably.

## 🧮 How they reach the ledger

1. `syncSchedule` in `features/transactions/model/schedules.ts` brings a schedule's postings in line when you edit it, from today on:
   - 🧾 **Recorded entries stay.** An entry dated today or earlier keeps its amount, note, tags and photos; changing the rent from next month does not rewrite the months already paid.
   - 🔮 **Planned entries follow the schedule.** Entries still ahead take the new amount, category, account and day, and keep their tags, photos and the "left out" mark.
   - 🗑️ **A deleted month stays deleted.** A month the schedule booked before and you removed is not booked again; months it never covered are booked, so moving the start earlier fills those months in.
   - ✂️ **Months outside the span go.** Moving the start later or the end earlier removes the entries outside it, unless they came from the bank or carry tags or photos.
2. `materializeRecurring` books every slot a schedule covers up to twelve months ahead: a month, or a day for weekly ones (their entries are `rec:<id>:2026-10-05`), on the server when it loads an account and again in the browser, so the calendar, the cash forecast, the morning note and bank imports all see what is coming.
3. 🫥 **Planned months are not stored until they matter.** A month still ahead that nobody changed exists only as the schedule's promise: the server leaves it out of the records table and books it again on every load (`isUntouchedPlan`). It is stored the moment it carries something of its own (another amount, a tag, a photo, the bank's payment) or once its day has passed, so recorded history never depends on the schedule again.
4. 🚫 **Deleted months stay deleted.** Removing a planned or past entry of a schedule adds its month to the schedule's `skipped` list (`rememberSkipped`, in the store and again on the server), so it is never booked again. A month the schedule never covered before, such as a past month a later end now reaches, is skipped the same way when the schedule is saved.
5. Generated transactions carry `recurringId` or `subscriptionId`, which is why they do not count as "logged by hand" in the [gamification](./gamification.md) XP.
6. An imported payment that is the real version of a posting takes its place, see [Bank import](./bank-import.md#-planned-payments).

> [!WARNING]
> Deleting a rule or subscription removes every entry it posted, past and future alike, and the dialog says how many. Payments imported from the bank stay as plain entries. To keep the history, set an end month instead.
