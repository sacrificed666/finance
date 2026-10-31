"use client";

import { useStore } from "@/app/hooks";
import type { RecurringRule } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { instalmentProgress, type RecurringStatus } from "@/features/transactions/model/recurring";
import { scheduleWhen } from "@/features/transactions/model/scheduleText";
import StatusBadge from "@/features/transactions/ui/StatusBadge/StatusBadge";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMonthText, todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";

import styles from "./RecurringCard.module.scss";

interface RecurringRowProps {
  rule: RecurringRule;
  status: RecurringStatus;
  onOpen: (rule: RecurringRule) => void;
}

// One rule: its category, when it books, its span or instalments and signed amount
const RecurringRow = ({ rule, status, onOpen }: RecurringRowProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const category = useCategoryName();
  const entry = state.categories.find((item) => item.id === rule.categoryId);
  const income = rule.type === "income";
  const plan = instalmentProgress(state, rule, todayISO());
  return (
    <li>
      <button type="button" onClick={() => onOpen(rule)} className={cx(styles.row, status !== "now" && styles.idle)}>
        <IconDisc colorSlot={entry?.colorSlot} size="lg">
          {entry?.icon ?? "❓"}
        </IconDisc>
        <span className={styles.body}>
          <span className={styles.title}>
            <span className={styles.name}>
              {category(entry)}
              {rule.note && rule.note.trim() !== category(entry) && <span className={styles.note}> · {rule.note}</span>}
            </span>
            <StatusBadge status={status} />
          </span>
          <span className={styles.meta}>
            {scheduleWhen(t, rule)}
            {" · "}
            {plan
              ? t("tx.rec.instalment.progress", {
                  paid: plan.paid,
                  count: plan.count,
                  left: formatMoney(plan.left, rule.currency),
                })
              : rule.endMonth
                ? t("tx.rec.range", { from: formatMonthText(rule.startMonth), to: formatMonthText(rule.endMonth) })
                : t("tx.rec.since", { from: formatMonthText(rule.startMonth) })}
          </span>
        </span>
        <span className={cx(styles.amount, income && styles.amountIn)}>
          {formatMoney(income ? rule.amount : -rule.amount, rule.currency, { sign: true })}
        </span>
      </button>
    </li>
  );
};

export default RecurringRow;
