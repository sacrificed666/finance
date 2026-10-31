# 🏦 Accounts and assets

## 🗂️ Account kinds

| Kind      | Icon | What it is                                                 | Balance comes from                                 |
| --------- | ---- | ---------------------------------------------------------- | -------------------------------------------------- |
| `card`    | 💳   | Bank card                                                  | Opening balance + ledger                           |
| `cash`    | 💵   | Physical money                                             | Opening balance + ledger                           |
| `savings` | 🏦   | Savings account                                            | Opening balance + ledger                           |
| `wallet`  | 📲   | E-wallet (Wise, Revolut, PayPal, …)                        | Opening balance + ledger                           |
| `crypto`  | 🪙   | Cryptocurrency wallet or exchange                          | Coin holdings at live prices + cash on the account |
| `skins`   | 🎮   | Game items (CS2, Dota 2, TF2, Rust, PUBG or a custom game) | Opening balance + ledger                           |
| `other`   | 📦   | Anything else                                              | Opening balance + ledger                           |

Every account has a currency, an optional savings goal (target and deadline) and an optional brand or game logo used as its mark.

## 🎯 Goals of their own

A goal does not have to be one account's. **Goal** on the Accounts page makes one with a name, an emoji, a target in any currency and an optional deadline. It counts the money put aside by hand (cash, or money outside the app's accounts) plus the whole balance of every account picked for it, each converted to the goal's currency; an account in debt adds nothing. The goals card lists these beside the accounts' own goals, with what each needs a month to meet its deadline (`goalsSummary` in `features/accounts/model/goals.ts`).

## 💳 Credit cards

A card account can carry a **credit limit** (`credit.limit`). Ukrainian credit cards charge no interest on last month's purchases when they are paid back by the end of this month, so the account shows **Pay back … by …**: the debt at the end of last month, less what came into the card since (`graceDue` in `features/accounts/model/grace.ts`). Coming up lists it until the end of the month, and the morning notification reminds three days before and on the day.

## 📊 Allocation over time

Below the debts, **Allocation over time** stacks what the assets were made of at the end of each month, by kind of account and investment or by currency, with the latest shares in the legend and a table behind the chart. It needs two months of entries to compare (`allocationHistory` in `features/accounts/model/allocationHistory.ts`).

### 🗄️ Archive

An account you no longer use, such as a closed card, can be archived from its sheet instead of deleted (`archived: true`). It keeps its history and its balance still counts in net worth, but it leaves every account picker (entries, transfers, schedules, income, CSV and Monobank import) and new entries no longer start in it. On the Accounts page it waits behind "Show 1 archived account", marked "Archived"; the dashboard's holdings list it only while it still holds money. An entry already booked to an archived account keeps it in its own picker, and **Restore** in the sheet brings the account back (`archiveAccount` and `pickableAccounts` in `features/accounts/model/accounts.ts`).

## 🪙 Cryptocurrency accounts

One account represents one wallet or exchange and holds **several coins**:

```ts
interface CoinHolding {
  coin: string; // CoinGecko id, e.g. "bitcoin"
  quantity: number; // how many you hold
  price?: number; // last fetched price in the account currency
  icon?: string; // coin logo from CoinGecko
}
```

- The account balance is `Σ quantity × price` plus the cash sitting on the account (`openingBalance` + ledger movements).
- 24 popular coins are available (`features/accounts/model/coins.ts`), including BTC, ETH, USDT, SOL, TON and WBT.
- Prices come from CoinGecko in the account's own currency; **Load prices** in the form and the hourly refresh both update them, and saving fetches any missing price automatically.
- The account row lists its coins, so `0.0015 BTC · 0.031 ETH` is visible without opening anything.

> [!NOTE]
> Cryptocurrency can also be tracked as an investment position: one coin, one entry, with its cost basis and expected return. Use an account when several coins live in one place, and an investment when you want to track a single position's profit.

> [!TIP]
> Recording the fiat you keep on an exchange as "cash on the account" keeps net worth honest without inventing a stablecoin holding.

## 🎮 Game items

`skins` accounts model inventories whose value you check by hand. Five games with an active item market ship with logos (CS2, Dota 2, Team Fortress 2, Rust, PUBG); anything else is a custom entry with your own name and an optional HTTPS logo URL.

> [!WARNING]
> Game item accounts are left out of the emergency fund: an inventory is not cash.

## 🏷️ Brands and logos

`features/accounts/model/brands.ts` lists the supported brands in three groups:

| Group                    | Brands                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| Ukrainian banks          | monobank, PrivatBank, Oschadbank, PUMB, Raiffeisen, Sense, A-Bank, OTP, UkrSib, Ukrgasbank, izibank |
| Fintech                  | Wise, Revolut, PayPal, Payoneer                                                                     |
| Cryptocurrency exchanges | WhiteBIT, Binance, Bybit, OKX                                                                       |

Logos are **self-hosted**: `public/brands/*.png` (128 px, from the official app icons) and `public/games/*.png` (256 px, from the official game icons and vector logos), with remote favicon services and the Steam CDN as a fallback chain. `RemoteLogo` walks the source list on error and skips images smaller than 24 px, which used to slip through as blurry letter placeholders. Every logo is cut to a circle and sits inside its disc with the disc's tint around it, so no corner of a square game or fund logo sticks out; the logo beside the bank and game pickers in the account form sits on a round disc too.

> [!CAUTION]
> `src/proxy.ts` leaves `brands/` and `games/` out of the session gate. A new folder in `public/` needs the same, otherwise the proxy answers its images with a redirect to the sign-in page.

## 💸 Balancing and transfers

- **Reconcile** on a normal account compares the app's number with what the bank shows and posts a single adjusting entry to "Other income" or "Other expenses".
- Transfers move money between accounts; cross-currency transfers carry `toAmount`, so both sides stay exact.
- Cryptocurrency accounts have no reconcile button: their value follows the coin prices.
- **Bank balances** appears on the Accounts page once Monobank is connected and cards are linked. It sets each linked account against what Monobank last reported and marks the ones that differ; **Match** opens the reconcile sheet with the bank's figure filled in. See [Bank import](./bank-import.md#-bank-balances).

## 💳 Debts

A `Debt` has a balance, an optional starting amount, a yearly rate and a monthly payment. The Debts card shows how much of each is paid off, the month it clears, the interest still ahead, and the same figures for all debts together (`debtPayoff` in `features/data/model/finmath.ts`).

**Plan the payoff** opens a sheet that sets the debts as they stand against a plan (`planPayoff` in `features/accounts/model/payoff.ts`):

| Setting                     | Effect                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Extra each month            | Paid on top of the debts' own payments, in the base currency                                   |
| Highest rate (avalanche)    | The extra goes to the dearest debt first, for the least interest overall                       |
| Smallest balance (snowball) | The extra goes to the smallest debt first, so debts disappear sooner at a little more interest |

The plan keeps paying the same total every month: when a debt is cleared, its payment moves on to the next one, so even without an extra amount it finishes sooner than the debts as they stand. The sheet shows the debt-free month and the interest both ways, what the plan saves, and the order in which the debts clear. All figures are in the base currency at today's rates; a debt with no monthly payment is paid only from the extra.

## 🤝 Money owed to you

Money you lent is a `Receivable`: who has it, how much, since when, an optional due date and how much has come back. The Accounts page lists them beside debts with what is still out and how many are overdue; the outstanding part counts towards net worth, and due dates appear in the Calendar.

## 📊 Where accounts show up

| Screen                     | Use                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Accounts                   | Table with per-currency columns, goals, search, kind filter, sorting; goal summary and debts beside it |
| Dashboard                  | Net worth split by kind                                                                                |
| Expenses / Income          | Account picker on every entry, and account filters in the ledger                                       |
| Profile → Financial health | Liquid accounts feed the emergency fund, all of them feed diversification                              |
