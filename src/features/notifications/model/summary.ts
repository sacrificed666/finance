import { categoryName } from "@/features/data/model/categoryName";
import { counts, rollupToParents } from "@/features/data/model/finmath";
import type { AppState } from "@/features/data/model/types";
import { setFormatLocale } from "@/shared/i18n/format";
import type { I18n } from "@/shared/i18n/translate";
import { addDays, addMonths, dateInMonth, formatMonth, monthOf } from "@/shared/lib/date";
import { convert, formatMoney, formatPercent, ratesAt } from "@/shared/lib/money";

import type { PushMessage } from "./reminders";

export type SummaryKind = "weekly" | "monthly";

interface Span {
  from: string;
  to: string;
}

// The days a summary sent today covers and the ones before, or null
export const summarySpans = (kind: SummaryKind, today: string): { current: Span; before: Span } | null => {
  if (kind === "weekly") {
    if (new Date(`${today}T12:00:00Z`).getUTCDay() !== 1) return null;
    const current = { from: addDays(today, -7), to: addDays(today, -1) };
    return { current, before: { from: addDays(today, -14), to: addDays(today, -8) } };
  }
  if (!today.endsWith("-01")) return null;
  const month = addMonths(monthOf(today), -1);
  const previous = addMonths(month, -1);
  return {
    current: { from: `${month}-01`, to: dateInMonth(month, 31) },
    before: { from: `${previous}-01`, to: dateInMonth(previous, 31) },
  };
};

// Money in and out over some days in the base currency, and by category
const spanTotals = (state: AppState, { from, to }: Span) => {
  const { settings } = state;
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  for (const tx of state.transactions) {
    if (tx.date < from || tx.date > to || tx.type === "transfer" || !counts(tx)) continue;
    const value = convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
    if (tx.type === "income") {
      income += value;
      continue;
    }
    expense += value;
    byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + value);
  }
  return { income, expense, byCategory: rollupToParents(byCategory, state.categories) };
};

// Last week's or month's money in short, or null when there is none
export const summaryMessage = (state: AppState, today: string, kind: SummaryKind, i18n: I18n): PushMessage | null => {
  const spans = summarySpans(kind, today);
  if (!spans) return null;
  const now = spanTotals(state, spans.current);
  if (now.income === 0 && now.expense === 0) return null;
  setFormatLocale(i18n.intl);
  const base = state.settings.baseCurrency;
  const before = spanTotals(state, spans.before);
  // An amount in the base currency
  const money = (amount: number) => formatMoney(amount, base);
  const change = before.expense > 0 ? ((now.expense - before.expense) / before.expense) * 100 : null;
  const compared =
    change === null || Math.abs(change) < 1
      ? ""
      : ` · ${i18n.t(change < 0 ? `push.summary.less.${kind}` : `push.summary.more.${kind}`, {
          pct: formatPercent(Math.abs(change), 0),
        })}`;
  const [topId, topAmount] = [...now.byCategory].toSorted((a, b) => b[1] - a[1])[0] ?? [];
  const lines = [
    `${i18n.t("push.summary.spent", { amount: money(now.expense) })}${compared}`,
    now.income > 0 ? i18n.t("push.summary.earned", { amount: money(now.income) }) : null,
    topId !== undefined && topAmount !== undefined
      ? i18n.t("push.summary.top", {
          category: categoryName(
            i18n,
            state.categories.find((category) => category.id === topId),
          ),
          amount: money(topAmount),
        })
      : null,
  ];
  return {
    title:
      kind === "weekly"
        ? i18n.t("push.summary.week")
        : i18n.t("push.summary.month", { month: formatMonth(monthOf(spans.current.from)) }),
    body: lines.filter(Boolean).join("\n"),
    url: "/reports",
    tag: `summary-${kind}-${spans.current.to}`,
  };
};
