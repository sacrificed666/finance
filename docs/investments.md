# 📈 Investments

## 🧾 Kinds and how they are valued

| Kind         | Valuation                       | Return type                                   | Notes                         |
| ------------ | ------------------------------- | --------------------------------------------- | ----------------------------- |
| `deposit` 🏦 | Accrual: the app compounds it   | Capitalised **or** paid out, with a frequency | Classic bank deposit          |
| `bonds` 📜   | Accrual                         | Coupons paid out (no choice)                  | Government or corporate bonds |
| `reit` 🏢    | Market value                    | Dividends paid out **or** reinvested          | Generic property fund         |
| `inzhur` 🏛️  | Market value from published NAV | Decided by the fund, see below                | Inzhur certificates           |
| `stocks` 📈  | Market value                    | Price growth (no payouts)                     | Shares or an index fund       |
| `crypto` 🪙  | Market value from CoinGecko     | Price growth                                  | A single coin position        |
| `other` 📦   | Market value                    | Price growth                                  | Anything else you hold        |

"Accrual" means the app computes today's value from the rate, the start date and the compounding schedule. "Market value" means the position is worth what it is worth today, and the expected return is only used to project forward.

## 🔁 Return types are automatic

`features/investments/model/returns.ts` decides which options a kind supports, so nothing nonsensical can be selected:

```ts
deposit → interest    choices: capitalise | pay out      (+ frequency when capitalised)
bonds   → coupons     choices: pay out
reit    → dividends   choices: pay out | reinvest
inzhur  → dividends or growth, depending on the fund
stocks  → growth      choices: reinvest (price growth)
crypto  → growth
other   → growth
```

The form shows a segmented control only when there is a real choice; otherwise it states the fact: "Bond coupons are paid out to you; they are never added to the bond itself." Normalization repairs old entries, so a bond saved years ago as "compound monthly" becomes "coupons paid out".

## 🏛️ Inzhur funds

Three funds are supported, and everything about them is fetched rather than typed:

| Fund           | Income                                       | Linked currency | Published forecast |
| -------------- | -------------------------------------------- | --------------- | ------------------ |
| Inzhur REIT    | Monthly dividends + capitalisation           | USD             | from 9.5% per year |
| Inzhur Energy  | Capitalisation only                          | USD             | 15% per year       |
| Inzhur MilTech | Capitalisation only (fund reinvests coupons) | UAH             | 25 to 29% per year |

`GET /api/inzhur` fetches each fund's public offer page server-side and extracts:

- **NAV per certificate** ("ВЧА на сертифікат" or "ВЧА на 1 сертифікат"), used to value your position;
- **forecast yield**, including ranges such as `25-29%`;
- **actual yield over the last 12 months**, when the fund publishes it.

> [!IMPORTANT]
> On the fund pages the **number comes before its label** ("від 9,5% у USD · Прогнозована дохідність фонду, річних"). The route therefore reads the percentage _in front of_ each label and only falls back to the text after it, which is the prose form MilTech uses. Reading forward first is what made REIT report its 12-month result as the forecast.

NAV is read from the rendered `<dd>/<dt>` pair, and when the page ships it only inside the HTML-escaped island payload (`&quot;value&quot;…&quot;certificateNetAssetPrice&quot;`), the route unescapes the markup and takes the number in front of that key.

Results are cached in memory for 10 minutes **per fund**, so a page that fails to parse keeps its last good quote instead of dropping out of the response. Each request has a 12-second timeout and the route requires a session.

> [!NOTE]
> Opening or changing an Inzhur position loads NAV and yields automatically; the expected-return field is read-only because the fund publishes it. The hourly refresh updates NAV _and_ the forecast for every Inzhur position at once, so nothing has to be typed or pressed.

> [!WARNING]
> Scraping depends on the published page structure. If Inzhur redesigns, the route falls back to the built-in figures in `features/investments/model/inzhur.ts`; update the regular expressions in `features/investments/api/inzhurSite.ts` when that happens.

## 🔮 Projections

`projectedSnapshot(inv, today, date)` looks one year ahead on the Investments page:

- accrual kinds grow by their contracted rate and schedule;
- market kinds with reinvested returns compound the expected rate;
- market kinds that pay out keep their value and accumulate `paidOut`, which the card shows as expected earnings;
- monthly top-ups are added as deposits, never counted as profit; in the one-year outlook they arrive through the year, so on average half of them earn for the whole year.

> [!CAUTION]
> Expected return is a forecast you enter (or that Inzhur publishes). It never changes what a position is worth today, only what the "in a year" row shows.

## 💹 Live prices

| Asset                                   | Source                        | Trigger                                                                                   |
| --------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| Cryptocurrency (accounts and positions) | CoinGecko                     | The hourly refresh, **Load prices** in the account form, or saving a coin without a price |
| Inzhur certificates                     | inzhur.reit via `/api/inzhur` | The hourly refresh, opening the investment form, **Load NAV**                             |

Prices refresh on their own every hour on the hour, and immediately after a load when the stored prices are older than an hour. Only one browser tab runs each hourly refresh.

Every position stores `pricedAt`, shown as a tooltip and in the card, so you always know how fresh the number is.

> [!TIP]
> CoinGecko rate-limits anonymous callers. If a refresh fails, the app keeps the previous prices and shows the error inline instead of clearing your portfolio.
