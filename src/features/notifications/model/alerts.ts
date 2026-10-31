import { categoryName } from "@/features/data/model/categoryName";
import type { AppState, Transaction } from "@/features/data/model/types";
import type { PushMessage } from "@/features/notifications/model/reminders";
import { budgetSpent, isYearly } from "@/features/transactions/model/budgets";
import { budgetLimit, descendantsOf } from "@/features/transactions/model/categories";
import { setFormatLocale } from "@/shared/i18n/format";
import type { I18n } from "@/shared/i18n/translate";
import { monthOf } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";

// The shares of a budget that call for a notification, the higher first
const THRESHOLDS = [100, 80];

// The notification of an entry the bank booked
export const operationMessage = (state: AppState, tx: Transaction, i18n: I18n): PushMessage => {
  setFormatLocale(i18n.intl);
  const signed = tx.type === "expense" ? -tx.amount : tx.amount;
  const account = state.savings.find((a) => a.id === tx.accountId);
  const category = categoryName(
    i18n,
    state.categories.find((c) => c.id === tx.categoryId),
  );
  return {
    title: [formatMoney(signed, tx.currency, { sign: true }), tx.note].filter(Boolean).join(" · "),
    body: [[category, account?.name].filter(Boolean).join(" · "), i18n.t("push.op.tap")].join("\n"),
    url: `/transactions?tx=${encodeURIComponent(tx.id)}`,
    tag: `op-${tx.id}`,
  };
};

// Notifications of budgets an expense took past 80% or 100%
export const budgetCrossings = (before: AppState, after: AppState, tx: Transaction, i18n: I18n): PushMessage[] => {
  if (tx.type !== "expense") return [];
  setFormatLocale(i18n.intl);
  const month = monthOf(tx.date);
  const out: PushMessage[] = [];
  for (const budget of after.budgets) {
    if (!descendantsOf(after.categories, budget.categoryId).has(tx.categoryId)) continue;
    const limit = budgetLimit(after, budget, month);
    if (limit <= 0) continue;
    const spentNow = budgetSpent(after, budget, month);
    const was = (budgetSpent(before, budget, month) / limit) * 100;
    const now = (spentNow / limit) * 100;
    const crossed = THRESHOLDS.find((t) => was < t && now >= t);
    if (crossed === undefined) continue;
    const spent = formatMoney(spentNow, budget.currency);
    const cap = formatMoney(limit, budget.currency);
    out.push({
      title: i18n.t("push.budget.title", {
        category: categoryName(
          i18n,
          after.categories.find((c) => c.id === budget.categoryId),
        ),
      }),
      body:
        crossed >= 100
          ? i18n.t("push.budget.over", { spent, limit: cap })
          : i18n.t("push.budget.near", { pct: String(Math.floor(now)), spent, limit: cap }),
      url: "/transactions",
      tag: `budget-${budget.categoryId}-${isYearly(budget) ? month.slice(0, 4) : month}`,
    });
  }
  return out;
};
