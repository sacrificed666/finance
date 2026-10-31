"use client";

import { useStore } from "@/app/hooks";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import type { FrequentEntry } from "@/features/transactions/model/frequent";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMoney } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";

import styles from "./FrequentChips.module.scss";

interface FrequentChipsProps {
  entries: FrequentEntry[];
  onPick: (entry: FrequentEntry) => void;
}

// The entries typed most often, a tap away from filling the form; away without any
const FrequentChips = ({ entries, onPick }: FrequentChipsProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const category = useCategoryName();
  if (entries.length === 0) return null;
  return (
    <FieldSet label={t("tx.frequent")}>
      <div className={styles.chips}>
        {entries.map((entry) => {
          const kind = state.categories.find((item) => item.id === entry.categoryId);
          return (
            <Button key={entry.key} variant="ghost" size="sm" className={styles.chip} onClick={() => onPick(entry)}>
              <span aria-hidden>{kind?.icon ?? "💸"}</span>
              <span className={styles.name}>{entry.note || category(kind)}</span>
              {entry.amount !== null && (
                <span className={styles.amount}>{formatMoney(entry.amount, entry.currency)}</span>
              )}
            </Button>
          );
        })}
      </div>
    </FieldSet>
  );
};

export default FrequentChips;
