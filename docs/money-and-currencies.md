# 💱 Money and currencies

## 🪙 Supported currencies

| Code  | Symbol | Role                                                       |
| ----- | ------ | ---------------------------------------------------------- |
| `UAH` | ₴      | Default base currency, the unit every internal metric uses |
| `USD` | $      | Foreign                                                    |
| `EUR` | €      | Foreign                                                    |

The **base currency** (Settings → General) decides what totals, charts and forecasts are shown in. Individual accounts, investments, debts and transactions keep their own currency; conversion happens only for display and aggregation.

An entry in another currency than its account's, a $20 purchase on a hryvnia card say, moves the account by that amount converted at the rates of its month (`accountBalance` and `accountBalances` in `features/data/model/finmath.ts`); a transfer moves the sender by its amount and the receiver by what arrived. Choosing an account in the entry form or Quick add switches the amount to that account's currency, and another currency can still be picked.

> [!NOTE]
> `displayCurrencies(state)` in `features/data/model/currencies.ts` shows a currency only once you actually use it, as the base currency or on an account, investment, debt, subscription, recurring rule or transaction, so tables stay narrow.

## 📈 Exchange rates

Rates live in `settings.rates` as "one unit of foreign currency in UAH". `settings.ratesMeta` keeps the buy/sell pair behind each number, and `ratesSource` records where it came from.

| Source   | Endpoint                                                    | Notes                                                     |
| -------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| Monobank | `api.monobank.ua/bank/currency`                             | Preferred; rate-limited to one request per 5 minutes      |
| NBU      | `bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json` | Fallback, official mid rate                               |
| Manual   | None                                                        | Typing a rate in Settings switches the source to `manual` |

Rates refresh **automatically at the top of every hour** (10:00, 11:00, …) and right after a load when the stored numbers are older than an hour. There is no refresh button: Settings shows when the last update happened and when the next one is due.

Conversions use the **buy** rate: what you would actually receive when selling foreign currency.

```ts
convert(amount, "USD", "UAH", rates); // amount × rates.USD
convert(amount, "UAH", "USD", rates); // amount ÷ rates.USD
convert(amount, "USD", "EUR", rates); // through UAH
```

### 🗓️ Rates of past months

Money that moved in a past month is counted at that month's rate, so a dollar salary from January stays what it was worth in January. `settings.monthRates` keeps, for every month that has ended, the NBU's average of the daily official rates for USD and EUR (`GET /api/nbu-rate?month=YYYY-MM`, which averages the NBU's daily rates for the month and remembers the answer for the life of the server).

| Figure                                                                                                           | Converted at                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Income, spending and net per month or period: dashboard, month page, reports, calendar, budgets, income, exports | The rate of the month the entry falls in (`ratesAt(settings, date)` in `shared/lib/money.ts`), today's rate for the current month and anything planned |
| Balances, net worth, investments, the forecast                                                                   | Today's rate: they are what the money is worth now                                                                                                     |
| Tax declaration and income book                                                                                  | The NBU rate of the day the income arrived, as the Tax Code requires                                                                                   |

Months are filled in the background shortly after the app opens: the ones with entries that have no rate yet, newest first, twelve at a time (`monthsNeedingRates` in `features/market/model/monthRates.ts`). While everything is in hryvnias (base currency, entries and budgets), nothing is fetched at all. Until a month has its rate, today's rate stands in.

## 🔢 Formatting

`shared/lib/money.ts` formats through `Intl.NumberFormat` using the active locale, so the same number reads naturally in every language:

| Helper                                           | Example (en) | Example (uk) |
| ------------------------------------------------ | ------------ | ------------ |
| `formatMoney(1234.5, "UAH")`                     | `1,235 ₴`    | `1 235 ₴`    |
| `formatMoney(1234.5, "UAH", { exact: true })`    | `1,234.50 ₴` | `1 234,50 ₴` |
| `formatMoney(1234567, "UAH", { compact: true })` | `1.2M ₴`     | `1,2M ₴`     |
| `formatMoney(-500, "USD", { sign: true })`       | `−$500`      | `−$500`      |
| `formatPercent(6.5)`                             | `6.5%`       | `6,5%`       |
| `formatNumber(0.00153021, 8)`                    | `0.00153021` | `0,00153021` |

`parseAmount` accepts what people actually type: spaces, non-breaking spaces, commas as decimal separators, and a leading currency symbol. A single mark followed by exactly three digits is read as a thousands mark where the page language groups with it, so `1,500` is 1500 in English and `1.500` is 1500 in German, while both are 1.5 in Ukrainian; a mark that repeats in threes (`1,000,000`) is always grouping.

> [!TIP]
> Use the typographic minus (`−`) that `formatMoney` produces instead of a hyphen when you write amounts by hand in the UI: it aligns with tabular numbers.

## 🧾 Rounding rules

- Nothing is rounded in storage: amounts keep full precision as entered.
- Display rounds to whole units by default and to two decimals with `exact: true`.
- Cryptocurrency quantities are shown with up to 8 decimals (`formatNumber(value, 8)`).
- Comparisons that decide UI state (for example "balance reached the goal") use the raw values, not the rounded strings.
