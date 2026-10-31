"use client";

import Link from "next/link";

import { useStore } from "@/app/hooks";
import type { RecurringRule } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { instalmentProgress } from "@/features/transactions/model/recurring";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonthText, todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import styles from "./DebtsCard.module.scss";

// One purchase paid in parts: what is left, the payments made and the last one
const InstalmentRow = ({ rule }: { rule: RecurringRule }) => {
  const { state } = useStore();
  const { t } = useI18n();
  const category = useCategoryName();
  const entry = state.categories.find((item) => item.id === rule.categoryId);
  const progress = instalmentProgress(state, rule, todayISO());
  if (!progress || !rule.instalment) return null;
  const note = rule.note?.trim();
  const name = note === undefined || note === "" ? category(entry) : note;
  // A short amount in the plan's currency
  const money = (amount: number) => formatMoney(amount, rule.currency, { compact: true });

  return (
    <Link href="/transactions" className={styles.row}>
      <span className={styles.line}>
        <span className={styles.who}>
          <IconDisc colorSlot={entry?.colorSlot} size="lg">
            {entry?.icon ?? "💳"}
          </IconDisc>
          <span className={styles.text}>
            <span className={styles.name}>{name}</span>
            <span className={styles.kind}>
              {t("balance.instalment")} · {money(rule.amount)}
              {t("common.perMonth")}
            </span>
          </span>
        </span>
        <span className={styles.amounts}>
          <span className={styles.balance}>−{formatMoney(progress.left, rule.currency, { exact: true })}</span>
        </span>
      </span>
      <span className={styles.progress}>
        <ProgressMeter
          value={rule.instalment.total - progress.left}
          max={rule.instalment.total}
          label={t("balance.debt.paidLabel", { name })}
        />
        <span className={styles.paid}>
          {t("balance.instalment.paid", {
            paid: progress.paid,
            count: progress.count,
            month: formatMonthText(rule.endMonth ?? rule.startMonth),
          })}
        </span>
      </span>
    </Link>
  );
};

export default InstalmentRow;
