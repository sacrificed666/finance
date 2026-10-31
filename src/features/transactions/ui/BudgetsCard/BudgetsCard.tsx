"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import type { Budget } from "@/features/data/model/types";
import {
  budgetProgress,
  budgetTotals,
  canAddBudget,
  isYearly,
  monthlyBudgets,
  unbudgetedSpending,
} from "@/features/transactions/model/budgets";
import BudgetSheet from "@/features/transactions/ui/BudgetSheet/BudgetSheet";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonth } from "@/shared/lib/date";
import { sortItems } from "@/shared/lib/listing";
import { formatMoney, formatPercent } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Card from "@/shared/ui/Card/Card";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";

import BudgetRow from "./BudgetRow";

import styles from "./BudgetsCard.module.scss";

interface BudgetsCardProps {
  month: string;
}

// The month's budgets, the most used first, under how much of all of them is left
const BudgetsCard = ({ month }: BudgetsCardProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const base = state.settings.baseCurrency;
  const [target, setTarget] = useState<Budget | "new" | null>(null);
  const totals = budgetTotals(state, month);
  const unbudgeted = unbudgetedSpending(state, month);
  const canAdd = canAddBudget(state);
  const hasMonthly = monthlyBudgets(state).length > 0;
  // The most used first, the monthly budgets before the yearly ones
  const sorted = sortItems(state.budgets, (budget) => budgetProgress(state, budget, month).share, "desc");
  const rows = [...sorted.filter((budget) => !isYearly(budget)), ...sorted.filter(isYearly)];
  // Opens an empty budget while a category is left without one
  const add = () => {
    if (canAdd) setTarget("new");
  };
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, base, { compact: true });

  return (
    <Card
      title={t("tx.budgets")}
      subtitle={state.budgets.length > 0 ? formatMonth(month) : t("tx.budgets.subtitle")}
      icon="target"
      action={
        state.budgets.length > 0 ? (
          <AddButton size="sm" onClick={add} disabled={!canAdd} label={t("common.add")} />
        ) : undefined
      }
    >
      {hasMonthly && (
        <SummaryPanel
          className={styles.summary}
          value={
            totals.limit >= totals.spent
              ? t("tx.budgets.left", { amount: money(totals.limit - totals.spent) })
              : t("tx.budgets.over", { amount: money(totals.spent - totals.limit) })
          }
          tone={totals.spent > totals.limit ? "expense" : undefined}
          meta={formatPercent(totals.limit > 0 ? (totals.spent / totals.limit) * 100 : 0, 0)}
        >
          <ProgressMeter value={totals.spent} max={totals.limit} tone="budget" label={t("tx.budgets.all")} />
          {unbudgeted > 0.5 && (
            <p className={styles.outside}>{t("tx.budgets.outside", { amount: money(unbudgeted) })}</p>
          )}
        </SummaryPanel>
      )}
      {state.budgets.length === 0 ? (
        <EmptyState
          icon={<Icon name="target" />}
          title={t("tx.budgets.empty")}
          hint={t("tx.budgets.empty.hint")}
          action={<AddButton onClick={add} label={t("common.add")} />}
        />
      ) : (
        <ul className={styles.rows}>
          {rows.map((budget) => (
            <BudgetRow key={budget.categoryId} budget={budget} month={month} onOpen={setTarget} />
          ))}
        </ul>
      )}

      {target && (
        <BudgetSheet
          key={target === "new" ? "new" : target.categoryId}
          target={target}
          month={month}
          onClose={() => setTarget(null)}
        />
      )}
    </Card>
  );
};

export default BudgetsCard;
