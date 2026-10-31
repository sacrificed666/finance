"use client";

import Link from "next/link";
import { useState } from "react";

import { useStore } from "@/app/hooks";
import { dashboardInsights, type Insight } from "@/features/dashboard/model/insights";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import type { TaxObligation } from "@/features/income/model/taxCalendar";
import { usePeriodLabel } from "@/features/income/model/usePeriodLabel";
import TaxPaidSheet from "@/features/income/ui/TaxPaidSheet/TaxPaidSheet";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { daysBetween, formatDateShort, formatMonthText, todayISO } from "@/shared/lib/date";
import { formatMoney, formatNumber, formatPercent } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import Icon from "@/shared/ui/Icon/Icon";
import type { IconName } from "@/shared/ui/Icon/icons";

import styles from "./InsightsRow.module.scss";

// Whether a stored value is a list of texts
const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

interface Shown {
  key: string;
  icon: IconName;
  tone: "bad" | "warn" | "good" | "calm";
  title: string;
  body: string;
  href?: string;
  obligation?: TaxObligation;
}

// A few things worth a look right now, each a tap away from where it is fixed
const InsightsRow = () => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  const periodLabel = usePeriodLabel();
  const [dismissed] = usePersistentState<string[]>("subs.dismissed", [], isTextList);
  const [paying, setPaying] = useState<TaxObligation | null>(null);
  const today = todayISO();
  const insights = dashboardInsights(state, today, dismissed);
  if (insights.length === 0) return null;
  const base = state.settings.baseCurrency;
  // A category's name by its id
  const categoryName = (id: string) => category(state.categories.find((item) => item.id === id));
  // A tax's name with its period
  const taxName = (obligation: TaxObligation) =>
    t(`taxcal.${obligation.kind}`, { period: periodLabel(obligation.period) });

  // The words, the mark and the place of one insight
  const shown = (insight: Insight): Shown => {
    switch (insight.kind) {
      case "tax": {
        const { obligation } = insight;
        const days = daysBetween(today, obligation.due);
        let when = tp("taxcal.inDays", days);
        if (days < 0) when = t("taxcal.overdue", { date: formatDateShort(obligation.due) });
        else if (days === 0) when = t("taxcal.today");
        return {
          key: `tax:${obligation.id}`,
          icon: "receipt",
          tone: days < 0 ? "bad" : "warn",
          title: taxName(obligation),
          body: `${formatMoney(obligation.amount ?? 0, "UAH")} · ${when}`,
          obligation,
        };
      }
      case "review":
        return {
          key: "review",
          icon: "check",
          tone: "calm",
          title: tp("dash.insight.review", insight.count),
          body: t("dash.insight.review.body"),
          href: "/transactions?review=1",
        };
      case "loan": {
        const { receivable } = insight;
        return {
          key: `loan:${receivable.id}`,
          icon: "user",
          tone: "warn",
          title: t("dash.insight.loan", {
            name: receivable.name,
            amount: formatMoney(receivable.amount - receivable.repaid, receivable.currency),
          }),
          body: t("taxcal.overdue", { date: formatDateShort(receivable.dueDate ?? today) }),
          href: "/accounts",
        };
      }
      case "over":
      case "runsOut": {
        // A short amount in the budget's currency
        const money = (amount: number) => formatMoney(amount, insight.currency, { compact: true });
        const of = t("dash.budgets.of", { spent: money(insight.spent), limit: money(insight.limit) });
        const name = categoryName(insight.categoryId);
        return insight.kind === "over"
          ? {
              key: `over:${insight.categoryId}`,
              icon: "target",
              tone: "bad",
              title: t("dash.insight.over", { category: name }),
              body: `${t("tx.budgets.over", { amount: money(insight.spent - insight.limit) })} · ${of}`,
              href: "/transactions",
            }
          : {
              key: `runsOut:${insight.categoryId}`,
              icon: "target",
              tone: "warn",
              title: t("dash.insight.runsOut", { category: name, date: formatDateShort(insight.date) }),
              body: of,
              href: "/transactions",
            };
      }
      case "change": {
        const down = insight.now < insight.before;
        const pct = formatPercent((Math.abs(insight.now - insight.before) / insight.before) * 100, 0);
        // A short amount in the base currency
        const money = (amount: number) => formatMoney(amount, base, { compact: true });
        return {
          key: `change:${insight.categoryId}`,
          icon: "trend",
          tone: down ? "good" : "warn",
          title: t(down ? "dash.insight.down" : "dash.insight.up", { category: categoryName(insight.categoryId), pct }),
          body: t("dash.insight.versus", { now: money(insight.now), before: money(insight.before) }),
          href: "/reports",
        };
      }
      case "short": {
        const { account } = insight;
        return {
          key: `short:${account.id}`,
          icon: "wallet",
          tone: "bad",
          title: t("dash.insight.short", { name: account.name, date: formatDateShort(insight.date) }),
          body: t("dash.insight.shortBody", { amount: formatMoney(insight.balance, account.currency) }),
          href: "/accounts",
        };
      }
      case "unusual": {
        const { tx } = insight;
        const note = tx.note?.trim() ?? "";
        return {
          key: `unusual:${tx.id}`,
          icon: "bolt",
          tone: "warn",
          title: t("dash.insight.unusual", { name: note === "" ? categoryName(tx.categoryId) : note }),
          body: t("dash.insight.unusualBody", {
            amount: formatMoney(tx.amount, tx.currency),
            times: formatNumber(insight.times, 1),
          }),
          href: `/transactions?category=${encodeURIComponent(tx.categoryId)}`,
        };
      }
      case "priceUp": {
        // An amount in the bill's currency
        const money = (amount: number) => formatMoney(amount, insight.currency);
        return {
          key: `priceUp:${insight.name}`,
          icon: "trend",
          tone: "warn",
          title: t("dash.insight.priceUp", {
            name: insight.name,
            pct: formatPercent((insight.now / insight.before - 1) * 100, 0),
          }),
          body: t("dash.insight.priceUpBody", { now: money(insight.now), before: money(insight.before) }),
          href: `/transactions?category=${encodeURIComponent(insight.categoryId)}`,
        };
      }
      case "recap": {
        // A short amount in the base currency
        const money = (amount: number) => formatMoney(amount, base, { compact: true });
        const kept = insight.income - insight.expense;
        const month = formatMonthText(insight.month);
        const body = t("dash.insight.recapBody", { spent: money(insight.expense), income: money(insight.income) });
        return {
          key: `recap:${insight.month}`,
          icon: "chart",
          tone: kept >= 0 ? "good" : "warn",
          title:
            kept >= 0 && insight.income > 0
              ? t("dash.insight.recap", { month, pct: formatPercent((kept / insight.income) * 100, 0) })
              : t("dash.insight.recapShort", { month, amount: money(-kept) }),
          body: insight.categoryId
            ? `${body} · ${t("dash.insight.recapTop", { category: categoryName(insight.categoryId) })}`
            : body,
          href: `/reports?month=${insight.month}`,
        };
      }
      case "subscription": {
        const { suggestion } = insight;
        return {
          key: `subscription:${suggestion.key}`,
          icon: "repeat",
          tone: "calm",
          title: t("dash.insight.subscription", { name: suggestion.name }),
          body: `${formatMoney(suggestion.amount, suggestion.currency)} · ${tp("tx.subs.suggest.seen", suggestion.months)}`,
          href: "/transactions",
        };
      }
    }
  };

  return (
    <section aria-label={t("dash.insights")} className={styles.row}>
      {insights.map((insight) => {
        const item = shown(insight);
        const { obligation } = item;
        const body = (
          <>
            <span aria-hidden className={cx(styles.mark, styles[item.tone])}>
              <Icon name={item.icon} size={16} strokeWidth={2} />
            </span>
            <span className={styles.text}>
              <span className={styles.title}>{item.title}</span>
              <span className={styles.body}>{item.body}</span>
            </span>
          </>
        );
        if (obligation) {
          return (
            <div key={item.key} className={styles.insight}>
              {body}
              <Button variant="ghost" size="sm" className={styles.action} onClick={() => setPaying(obligation)}>
                {t("taxcal.markPaid")}
              </Button>
            </div>
          );
        }
        return (
          <Link key={item.key} href={item.href ?? "/"} className={cx(styles.insight, styles.link)}>
            {body}
            <Icon name="arrowRight" size={14} strokeWidth={2.2} className={styles.arrow} />
          </Link>
        );
      })}
      {paying && <TaxPaidSheet obligations={[paying]} onClose={() => setPaying(null)} />}
    </section>
  );
};

export default InsightsRow;
