"use client";

import { useMonthSummary } from "@/features/dashboard/model/useMonthSummary";
import { expensesByCategory, rollupToParents } from "@/features/data/model/finmath";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { budgetTotals } from "@/features/transactions/model/budgets";
import { useI18n } from "@/shared/i18n/useI18n";
import type { BreakdownSegment } from "@/shared/lib/chart";
import { formatMoney } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import CardLink from "@/shared/ui/CardLink/CardLink";
import CategoryMap from "@/shared/ui/CategoryMap/CategoryMap";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";
import LinkButton from "@/shared/ui/LinkButton/LinkButton";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";

import styles from "./SpendingCard.module.scss";

// The expenses page narrowed to a category
const categoryHref = (categoryId: string) => `/transactions?category=${encodeURIComponent(categoryId)}`;

// This month's spending as a map of categories under what the budgets have left
const SpendingCard = () => {
  const { state, base, month } = useMonthSummary();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  const byCategory = rollupToParents(expensesByCategory(state.transactions, month, state.settings), state.categories);
  const segments: BreakdownSegment[] = [...byCategory].map(([categoryId, value]) => {
    const entry = state.categories.find((item) => item.id === categoryId);
    return {
      id: categoryId,
      label: category(entry),
      icon: entry?.icon ?? "❓",
      value,
      colorSlot: entry?.colorSlot ?? 3,
    };
  });
  const budgets = budgetTotals(state, month);
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, base, { compact: true });

  if (segments.length === 0) {
    return (
      <Card title={t("dash.spending")} icon="spend" action={<CardLink href="/transactions" />}>
        <EmptyState
          icon={<Icon name="receipt" />}
          title={t("tx.where.empty")}
          hint={t("dash.spending.empty.hint")}
          action={
            <LinkButton href="/transactions" variant="ghost">
              {t("dash.addExpense")}
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const over = budgets.spent > budgets.limit;
  return (
    <Card
      title={t("dash.spending")}
      subtitle={tp("common.categories", segments.length)}
      icon="spend"
      action={<CardLink href="/transactions" />}
    >
      {budgets.limit > 0 && (
        <SummaryPanel
          className={styles.summary}
          value={
            over
              ? t("tx.budgets.over", { amount: money(budgets.spent - budgets.limit) })
              : t("tx.budgets.left", { amount: money(budgets.limit - budgets.spent) })
          }
          tone={over ? "expense" : undefined}
          meta={
            <>
              {t("dash.budgets.of", { spent: money(budgets.spent), limit: money(budgets.limit) })}
              {budgets.over > 0 && (
                <span className={styles.worse}> · {tp("dash.budgets.overCount", budgets.over)}</span>
              )}
            </>
          }
        >
          <ProgressMeter value={budgets.spent} max={budgets.limit} tone="budget" label={t("tx.budgets.all")} />
        </SummaryPanel>
      )}
      <CategoryMap segments={segments} currency={base} height={220} hrefOf={categoryHref} />
    </Card>
  );
};

export default SpendingCard;
