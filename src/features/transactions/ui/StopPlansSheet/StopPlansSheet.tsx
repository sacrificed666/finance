"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import type { RecurringRule } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { looksLikeFixedPayment } from "@/features/transactions/model/categories";
import { stopSchedules } from "@/features/transactions/model/schedules";
import { useI18n } from "@/shared/i18n/useI18n";
import { currentMonth } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import Sheet from "@/shared/ui/Sheet/Sheet";

import styles from "./StopPlansSheet.module.scss";

interface StopPlansSheetProps {
  rules: RecurringRule[];
  onClose: () => void;
}

// Stops the rules that book a whole budget; fixed payments start unticked
const StopPlansSheet = ({ rules, onClose }: StopPlansSheetProps) => {
  const { state, update } = useStore();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  const categoryById = new Map(state.categories.map((entry) => [entry.id, entry]));
  const [picked, setPicked] = useState<ReadonlySet<string>>(
    () =>
      new Set(rules.filter((rule) => !looksLikeFixedPayment(categoryById.get(rule.categoryId))).map((rule) => rule.id)),
  );
  // Ticks a rule or unticks it
  const pick = (id: string, on: boolean) =>
    setPicked((previous) => {
      const next = new Set(previous);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  // Stops the ticked rules from this month on
  const stop = () => {
    update((s) => stopSchedules(s, [...picked], currentMonth()), t("tx.rec.plans.done"));
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("tx.rec.plans.sheetTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={stop} disabled={picked.size === 0}>
            {tp("tx.rec.plans.stopCount", picked.size)}
          </Button>
        </>
      }
    >
      <p className={styles.intro}>{t("tx.rec.plans.confirm")}</p>
      <ul className={styles.rows}>
        {rules.map((rule) => {
          const entry = categoryById.get(rule.categoryId);
          return (
            <li key={rule.id}>
              <label className={styles.row}>
                <input
                  type="checkbox"
                  checked={picked.has(rule.id)}
                  onChange={(event) => pick(rule.id, event.target.checked)}
                  className={styles.check}
                />
                <IconDisc colorSlot={entry?.colorSlot} size="md">
                  {entry?.icon ?? "❓"}
                </IconDisc>
                <span className={styles.body}>
                  <span className={styles.name}>
                    {category(entry)}
                    {rule.note && <span className={styles.note}> · {rule.note}</span>}
                  </span>
                  {looksLikeFixedPayment(entry) && <span className={styles.fixed}>{t("tx.rec.plans.fixed")}</span>}
                </span>
                <span className={styles.amount}>{formatMoney(rule.amount, rule.currency, { compact: true })}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
};

export default StopPlansSheet;
