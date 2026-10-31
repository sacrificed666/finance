# 🏦 Bank import

Entries can come straight from the bank instead of being typed: from Monobank's personal API, or from a CSV statement any bank can export. Both end in the same preview, where every row gets a category, duplicates start unticked, and nothing is booked until you confirm.

Everything lives in **Settings → Import from your bank**; the rules that pick categories sit right below it, in **Auto-categorisation**.

## 🐈 Monobank

| Step       | What happens                                                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connect    | Paste the personal token from `api.monobank.ua`. The server checks it against `client-info`, then seals the token and the card list into the `integrations` table                                              |
| Link cards | Each Monobank card is linked to one of your accounts (`settings.bankLinks`). Cards left unlinked are skipped                                                                                                   |
| Load       | Pick 7, 14 or 31 days. Linked cards are read one after another; entries are booked to the linked account in the card's currency, on the day the operation happened in Ukraine whatever the server's clock says |
| Disconnect | Deletes the `integrations` row, token included                                                                                                                                                                 |

> [!IMPORTANT]
> The token never reaches the browser. `GET /api/monobank` returns only the card list (masked number, currency); statements are fetched by the server with the sealed token.

Monobank answers one statement request per minute. The server keeps 61 seconds between calls per user and, when asked too early, answers `429` with `wait:<seconds>`; the import card shows the countdown and carries on by itself. One request covers at most 31 days and an hour (`MONO_MAX_RANGE_S` in `features/import/api/monobank.ts`).

### 🤖 Automatic import

With **Import new operations automatically** on, Monobank sends every new operation on a linked card or jar to `POST /api/monobank/webhook/<key>`, and it is booked as it happens (categorised, paired with the other half of a transfer, matched to a planned payment) through the same `absorbOperation` the preview uses. An open tab picks the new entries up the moment it gets focus.

- It needs `AUTH_URL` set to the app's public **https** address; Monobank has to reach it.
- Monobank does not sign these calls, so the address itself is the secret: `<key>` is 24 random bytes, kept sealed with the token, and an unknown key gets `404`. Turning the switch off tells Monobank to stop; disconnecting forgets the key.
- Operations for one user are processed one after another, so the two halves of a transfer, which arrive almost together, still find each other. The transfer keeps the id of its second half in `bank.pairedId`, so Monobank sending that half again, or a statement holding it later, adds nothing. Operations on cards that are not linked are ignored.
- The account a call belongs to is found by a SHA-256 of its key, kept in a plain column beside the sealed connection, so a call opens one row, not every account's.
- Refreshing the card list keeps the address, so automatic import carries on after a refresh.

### ⚖️ Bank balances

Every operation Monobank sends carries the account's balance right after it. The server keeps the latest one per card or jar, with its time, from three places: the card list when it is fetched, every statement loaded, and every operation the webhook delivers (`recordMonoBalance`). None of them costs an extra request. **Check now** on the Accounts card fetches the card list again, within Monobank's one-request-a-minute limit.

Monobank counts a credit card's limit into its balance. The app keeps the limit apart (`creditLimit`) and compares only your own money, so a card with a 50 000 ₴ limit and 1 200 ₴ of your own reads 1 200 ₴, with "credit limit 50K ₴ not counted" beside it; a card in debt reads below zero. The same goes for the balances statements and the webhook report.

The card compares that balance with the linked account's balance in the app for today. A planned payment dated today that the bank has not charged yet shows up as a difference, which is what the card is for. **Match** books the difference through the reconcile sheet, as an adjusting entry.

## 📄 CSV statements

- **Reading the file.** UTF-8 first, Windows-1251 when the text comes out garbled (older Ukrainian exports). The delimiter (`;`, `,` or tab), quotes and a byte-order mark are handled in `features/import/model/csv.ts`.
- **Columns.** A mapping sheet guesses date, description, amount, an optional separate "money out" column and MCC from the header row, in Ukrainian or English; you can correct each one and choose the statement's currency and account.
- **Numbers and dates.** `1 234,56`, `1,234.56` and `-1234.56` all read correctly, and so do `31.12.2026`, `31/12/2026` and `2026-12-31`. Rows without a date or an amount (totals, blank lines) are skipped.
- **Other apps.** Exports of Monefy, Spendee and Wallet read the same way, with their category, account, currency, type and payee columns found too. A row goes to your category of the same name (in any language the app shows it in) and your account of the same name, in the currency it names; the type column decides spending or income, transfers are left out, and the payee stands in for a missing note. A bank's own currency column is ignored, since its amounts are already in the card's currency.

## 🏷️ Picking the category

`suggestCategory` in `features/import/model/import.ts` tries, in order:

1. **Your rules**: "description contains … → category", per type, first match wins. A rule matches when the description contains its text, or contains its words once digits and punctuation are left out of both, so `silpo kyiv` matches "SILPO 1234 KYIV" (`ruleMatches`).
2. **The merchant code** (MCC) for expenses: groceries, restaurants, transport, fuel, pharmacies, utilities and so on map to the default categories.
3. **Cashback** in the description for income.
4. "Other expenses" / "Other income".

### 🧠 Rules learned from corrections

Moving an imported entry to another category offers a rule in the same sheet: **Always file "…" under …**, on by default. Its text is the merchant: the first three words of the bank's description without digits and punctuation (`learnedRule`). When other imported entries from that merchant sit in a different category, a second switch moves them as well. The new rule goes to the top of the list, so it wins over a broader one, and a rule with the same text is replaced. Undo takes the rule and the moves back and keeps the edit itself.

Nothing is offered for typed entries, transfers, split purchases, or when a rule already files the merchant where the entry went.

### ✏️ Merchant names

Changing an imported entry's note offers **Always call “…” …** in the same way. The rule keeps the new name in `rename`, beside or instead of a category, and renames the merchant's other entries too. Every later import, from a statement or the webhook, takes the name from the first rule that matches and keeps the bank's own words in `bank.text`: the entry's sheet shows them under the note whenever the note says something else, and a search of the ledger or the command palette finds the entry by them too. A rule changed for its category keeps the rename an older rule of the merchant gave.

## 🔀 Transfers, cash and jars

`prepareImport` in `features/import/model/import.ts` reshapes what the bank sent before the preview shows it:

- **Your own transfers.** Money moved between two linked accounts arrives as two lines, out of one and into the other. Lines on different accounts within 15 minutes whose amounts match (directly, or through Monobank's operation amount when you buy currency) become one transfer. Unpaired, they would count as spending and income both.
- **Cash machines.** A withdrawal (MCC 6010/6011) becomes a transfer to your cash account in that currency, when you keep one.
- **Jars.** Monobank jars ("банки") are listed next to the cards and can be linked to an account of their own, so money put aside moves between accounts instead of looking spent.

## 🗓️ Planned payments

A recurring payment or a subscription posts a planned entry every month. When an imported operation is its real version, with the same direction and currency, within five days of the planned date and within 5% of the amount (20% when the description names the subscription, for a price that changed), it **takes that entry's place**: the same entry, now with the real amount, day and bank id. Nothing is counted twice, and editing or deleting the schedule later keeps the real payments.

Rules that post exactly their category's budget every month (Food 7,000 with a Food budget of 7,000) are plans rather than payments: they pin the budget at 100% and hide what was spent. The recurring card points them out and offers to stop them from this month on; bills such as rent or utilities start unticked, since posting those at their budget is usually the real payment.

## 🔁 Duplicates

Every imported entry keeps an `externalId`: `mono:<id>` for Monobank, `csv:<fingerprint>` for a statement row; a paired transfer also remembers its other line in `bank.pairedId`. A candidate is marked as already booked when its id, or its other line's, is in the ledger, or when an entry with the same date, type, amount and note exists (for entries typed by hand before the import; planned postings do not count, they are matched instead). Each such entry stands for one operation only, so two identical metro rides on one day, one typed and one not, bring in the second. Duplicates start unticked, so loading the same week twice adds nothing.

An entry typed by hand (or scanned from a receipt) for the same sum, type and currency a day either side counts as the bank's operation too, each typed entry once. The automatic import goes further: the typed entry takes the operation's `externalId` and bank details, keeps its own note and category, and nothing new is added.

## 👀 To review

Every entry an import books, from the preview, the webhook or two lines merged into one transfer, carries `unreviewed: true` and a **New** badge in the ledger. Saving it from its sheet clears the flag. **To review** above the ledger narrows it to those entries of every kind and month, with **Confirm all** to clear them at once, and picking a kind or a period leaves it; the dashboard's heads-up counts them and links to the same list (`/transactions?review=1`).

> [!NOTE]
> A statement row's fingerprint is its date, signed amount and description. The second identical row of a day gets a fingerprint of its own (`|2` added before hashing), so two equal purchases in one statement stay two entries, and loading the statement again still finds both.
