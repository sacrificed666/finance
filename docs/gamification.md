# 🎮 Gamification

Everything on the Profile page is derived from your own data by pure functions in `features/profile/model/achievements.ts`. Nothing is stored: delete a transaction and the numbers move back.

```ts
gamification(state) → { facts, health, achievements, xp, level }
```

## 📊 Facts

`financeFacts(state)` is the single pass over the data that everything else reads: counts of manual entries, active weeks and days, streaks, savings rate now and before, budget history, asset classes, liquidity, expected passive income, debt ratios and more. Computing it once keeps the page cheap and the definitions consistent.

## ⭐ XP and levels

XP rewards habits and outcomes, not clicking "add" a lot:

| Source       | Formula                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| Tracking     | 2 XP per manually logged entry, **capped at 80 XP per month**                                                  |
| Consistency  | 8 XP for every calendar week with at least one entry                                                           |
| Results      | 40 XP per month in the plus, 25 per month within every budget, 20 per frugal month (spending ≤ half of income) |
| Achievements | 50 / 150 / 400 / 1 000 XP for bronze / silver / gold / platinum                                                |

> [!NOTE]
> Automatically posted subscriptions and recurring rules give no XP: otherwise the score would grow while you do nothing.

Levels use a widening curve, so early levels come quickly and later ones take real time:

```text
threshold(level) = 100 × (level − 1) + 25 × (level − 1) × (level − 2)
level 2 → 100 XP      level 5 → 700 XP      level 10 → 2 700 XP      level 20 → 11 400 XP
```

Ten ranks sit on top of the levels (Newcomer → Money Legend) with floors at levels 1, 3, 5, 8, 11, 15, 20, 25, 32 and 40. The card shows where the XP came from, what this month added and which level unlocks the next rank.

## 🏆 Achievements

70 achievements in seven groups: getting started, tracking, budgets, savings, wealth, investing and mastery. Each has a tier, an icon, a target and live progress.

| Group           | Examples                                                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Getting started | First transaction, three accounts, first budget, first recurring payment                                                                                 |
| Tracking        | 50 / 500 / 2 000 manual entries, weekly streaks of 4 / 12 / 26, a year of tracking                                                                       |
| Budgets         | Five budgets, a month inside every budget, three and six months in a row                                                                                 |
| Savings         | 10 / 20 / 35% savings rate, positive-month streaks, emergency fund of 1 / 3 / 6 months, goals reached                                                    |
| Wealth          | Net worth milestones from ₴10 000 to ₴5 000 000, four currencies, debt-free                                                                              |
| Investing       | First position, five positions, three and five kinds, all three Inzhur funds, a quarter of assets invested, passive income of ₴1 000 and ₴10 000 a month |
| Mastery         | Taxed incomes, ended subscriptions, lean subscriptions, health scores of 50 / 70 / 90                                                                    |

The card shows tier counts, the three achievements closest to unlocking, status and group filters, and expands from twelve tiles to all of them on demand.

> [!TIP]
> Targets are checked against facts, so an achievement can unlock the moment the underlying number changes, with no scanning and no background job.

## ❤️ Financial health

A score from 0 to 100 in seven parts, each explained under its bar:

| Part              | Max | Full score when                                                      |
| ----------------- | --- | -------------------------------------------------------------------- |
| Savings rate      | 20  | You keep ≥ 20% of income over the last three months                  |
| Emergency fund    | 20  | Cash (plus investments at half weight) covers 6 months of spending   |
| Debt load         | 15  | No debt, or low debt-to-assets and payments well under 40% of income |
| Budget discipline | 10  | Every budget kept last month and the total stayed under the limit    |
| Stability         | 10  | Every one of the last 6 months in the plus with steady spending      |
| Diversification   | 10  | Five or more asset types and currencies, none dominating             |
| Investing         | 15  | ≥ 30% of assets invested and passive income covering 10% of spending |

Grades: **Excellent** ≥ 85, **Good** ≥ 70, **Fair** ≥ 50, otherwise **Needs attention**. The three weakest parts turn into tips that link straight to the page where you would fix them.

> [!WARNING]
> With less than three months of data the card says so. Ratios computed from one or two months swing wildly, and the score is meant to be read as a trend. Before the first entry there is no score at all: the card waits for one, and the hero and the dashboard show a dash instead of grading an empty account.

> [!CAUTION]
> Game item accounts are excluded from the emergency fund, and cryptocurrency counts at half weight in the cushion: volatile or illiquid holdings should not look like rainy-day money.
