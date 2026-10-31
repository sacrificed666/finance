# 🔮 Forecast

The Forecast page projects what you own month by month, up to 40 years ahead, and asks what it takes to reach a figure. Everything is computed in the browser from the saved state; nothing on the page is stored except planned events and the wishlist.

## 📐 What the projection counts

`buildProjection` in `features/data/model/finmath.ts` starts from today's balances and steps one month at a time:

| Part           | How it moves                                                                                                                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts       | Today's balances, growing by the **return on savings** set on the page, compounded monthly                                                                                                                                                      |
| What you keep  | With **Add what you keep each month** on, the average net result of the last six full months with entries (`averageKept`), less the investments' monthly top-ups, lands in the accounts every month; negative when spending ran ahead of income |
| Investments    | Each position valued on the same day of every future month the way the Investments page values it today: accrual, coupons, dividends, top-ups                                                                                                   |
| Payouts        | Interest, coupons and dividends an investment pays out land in the accounts in the month they are paid                                                                                                                                          |
| Planned events | One-off amounts in a given month: a purchase subtracts, a windfall adds                                                                                                                                                                         |
| Wishlist       | Items given a month join the events as planned purchases                                                                                                                                                                                        |
| Debts          | With **Subtract debts** on, each balance shrinks by its monthly payment and the chart shows net worth                                                                                                                                           |

The month in progress is left out of that average: halfway through, it holds the salary but not yet the spending. Top-ups are taken off because the money that goes into an investment is already counted there.

What the recurring rules and subscriptions will book moves that average month by month (`scheduleShift` in `features/forecast/model/scheduleShift.ts`): each month ahead gets the difference between what the schedules book in it and what they booked on average over the same six past months. An instalment that ends adds its payment back from the month after, a rule that starts later takes its amount off from then on, and steady rules change nothing. The hint under the switch says by how much they change the next year on average.

## 🎚️ Assumptions

| Control                      | Range                                   | Default                 |
| ---------------------------- | --------------------------------------- | ----------------------- |
| Horizon                      | 1 to 40 years                           | 10 years                |
| Return on savings            | 0 to 25 % a year, in half-percent steps | 0 %                     |
| Scenario spread              | 0 to 10 points                          | 3 points                |
| Show in today's money        | On or off                               | Off                     |
| Subtract debts               | On or off                               | On when there are debts |
| Add what you keep each month | On or off                               | On                      |

**Cautious** and **optimistic** runs use the return minus and plus the spread. The cautious one may go below zero, as savings that lose value would, so even a zero return shows a real range. The projection starts from net worth as the other pages count it: the money in accounts plus what people owe you back, less debts when **Subtract debts** is on. The projection chart draws savings and investments as two stacked bands with one line on their total, and shades the **scenario spread** between the cautious and optimistic totals behind them, month by month; its tooltip and hidden table give both ends.

**Today's money** deflates every point by inflation weighted by what you hold: 10 % a year for hryvnias, 3 % for dollars and 2.5 % for euros (`INFLATION_PCT` in `use-forecast.ts`), each weighed by its share of your holdings in the base currency.

The controls answer at once; the projection and every card built on it follow through `useDeferredValue`, so dragging a slider never waits for the yearly table.

## 🏁 Independence

The page marks the month the projected total could pay for your average monthly spending (over the last six months that had any), withdrawing 4 % a year (`SAFE_WITHDRAWAL_PCT` in `features/forecast/model/forecast.ts`). The hero also shows how much of that spending the total covers today.

## 🎯 Reach a goal

Enter an amount, a currency and a month. The card shows when the projection reaches the amount and, if the month comes first, how much more to put aside each month, on top of what the projection already counts, to close the gap, compounded at the same return on savings.

## 🛍️ Wishlist

Items are ordered by priority, then price. Each gets the month it becomes affordable if what you keep on average goes towards the list, one item after another. That pace is the same average as above: the net result of the last six full months that had any income or spending.

> [!TIP]
> Planned events made in older versions lived in the browser. They are moved into the saved data the first time the page opens (`features/forecast/model/useLegacyEvents.ts`), and the browser copy is removed.
