"use client";

import { useStore } from "@/app/hooks";
import type { Budget } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { budgetProgress, isYearly, runsOutOn } from "@/features/transactions/model/budgets";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDateShort, todayISO } from "@/shared/lib/date";
import { formatMoney, formatPercent } from "@/shared/lib/money";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import styles from "./BudgetsCard.module.scss";

interface BudgetRowProps {
  budget: Budget;
  month: string;
  onOpen: (budget: Budget) => void;
}

// One budget: its spending against the limit, a meter and when it runs out
const BudgetRow = ({ budget, month, onOpen }: BudgetRowProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  const entry = state.categories.find((item) => item.id === budget.categoryId);
  const { limit, spent, carried, moved, share } = budgetProgress(state, budget, month);
  const over = spent > limit;
  const yearly = isYearly(budget);
  const runsOut = runsOutOn(spent, limit, month, todayISO(), yearly);
  const subcategories = state.categories.filter((item) => item.parentId === budget.categoryId).length;
  const hasCarried = carried > 0.5;
  // A short amount in the budget's currency
  const money = (amount: number) => formatMoney(amount, budget.currency, { compact: true });
  // Under the meter: when it runs out, what carried over, the subcategories
  const notes: { text: string; warn: boolean }[] = [];
  if (yearly) notes.push({ text: t("tx.budgets.forYear", { year: month.slice(0, 4) }), warn: false });
  if (runsOut) notes.push({ text: t("tx.budgets.runsOut", { date: formatDateShort(runsOut) }), warn: true });
  if (hasCarried) notes.push({ text: t("tx.budgets.carried", { amount: money(carried) }), warn: false });
  if (moved > 0.5) notes.push({ text: t("tx.budgets.movedIn", { amount: money(moved) }), warn: false });
  if (moved < -0.5) notes.push({ text: t("tx.budgets.movedOut", { amount: money(-moved) }), warn: false });
  if (subcategories > 0) notes.push({ text: tp("tx.budgets.withSubs", subcategories), warn: false });

  return (
    <li>
      <button type="button" onClick={() => onOpen(budget)} className={styles.row}>
        <span className={styles.line}>
          <span aria-hidden className={styles.icon}>
            {entry?.icon ?? "❓"}
          </span>
          <span className={styles.name}>{category(entry)}</span>
          <span className={cx(styles.amounts, over && styles.overAmounts)}>
            {t("tx.budgets.of", { spent: money(spent), limit: money(limit) })}
          </span>
        </span>
        <span className={styles.meterLine}>
          <span className={styles.meter}>
            <ProgressMeter
              value={spent}
              max={limit}
              tone="budget"
              label={t("tx.budgets.itemLabel", { name: category(entry) })}
            />
          </span>
          <span className={cx(styles.share, over && styles.overShare)}>{formatPercent(share * 100, 0)}</span>
        </span>
        {notes.length > 0 && (
          <span className={styles.notes}>
            {notes.map((note, index) => (
              <span key={note.text} className={note.warn ? styles.runsOut : styles.muted}>
                {index > 0 && <span className={styles.muted}> · </span>}
                {note.text}
              </span>
            ))}
          </span>
        )}
      </button>
    </li>
  );
};

export default BudgetRow;
