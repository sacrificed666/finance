"use client";

import { useStore } from "@/app/hooks";
import type { IncomeTax, Transaction } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { breakdownSummary, incomeInBase } from "@/features/income/model/income";
import { taxRegime } from "@/features/income/model/tax";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDateShort, formatMonth, monthOf } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";

import styles from "./IncomeListCard.module.scss";

interface IncomeRowProps {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
}

// One income: its source, the details and tax under it, the amount and the day
const IncomeRow = ({ tx, onEdit }: IncomeRowProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const category = useCategoryName();
  const base = state.settings.baseCurrency;
  const entry = state.categories.find((item) => item.id === tx.categoryId);
  const account = state.savings.find((item) => item.id === tx.accountId);
  // The name of a stored tax: its own label, its regime or plain tax
  const taxName = (tax: IncomeTax) => {
    if (tax.label) return tax.label;
    return tax.regime ? t(taxRegime(tax.regime).shortKey) : t("income.tax");
  };
  // A note that only repeats the category says nothing new
  const note = tx.note?.trim() && tx.note.trim() !== category(entry) ? tx.note.trim() : "";
  const details = [
    note ? category(entry) : null,
    account?.name ?? null,
    tx.breakdown ? breakdownSummary(tx.breakdown, tx.currency, t("income.dayUnit")) : null,
    tx.tax
      ? t("income.netOfTax", { amount: formatMoney(tx.tax.gross - tx.amount, tx.currency), regime: taxName(tx.tax) })
      : null,
  ].filter(Boolean);
  let title = t("income.fallbackName");
  if (note) title = note;
  else if (entry) title = category(entry);

  return (
    <li>
      <button type="button" onClick={() => onEdit(tx)} className={styles.row}>
        <IconDisc colorSlot={entry?.colorSlot} size="lg">
          {entry?.icon ?? "💰"}
        </IconDisc>
        <span className={styles.body}>
          <span className={styles.title}>{title}</span>
          <span className={styles.details}>
            {details.length > 0 ? details.join(" · ") : formatMonth(monthOf(tx.date))}
          </span>
        </span>
        <span className={styles.end}>
          <span className={styles.amount}>{formatMoney(tx.amount, tx.currency, { sign: true })}</span>
          <span className={styles.day}>
            {tx.currency !== base && (
              <span className={styles.converted}>
                ≈ {formatMoney(incomeInBase(state, tx), base, { compact: true })}
                {" · "}
              </span>
            )}
            {formatDateShort(tx.date)}
          </span>
        </span>
      </button>
    </li>
  );
};

export default IncomeRow;
