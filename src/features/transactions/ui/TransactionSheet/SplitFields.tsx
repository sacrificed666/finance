"use client";

import { useStore } from "@/app/hooks";
import type { Transaction } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { entryFigures, splitTotalIn, type EntryForm, type SplitDraft } from "@/features/transactions/model/entryForm";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMoney } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import Icon from "@/shared/ui/Icon/Icon";
import OptionPicker, { type PickerGroup } from "@/shared/ui/OptionPicker/OptionPicker";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./TransactionSheet.module.scss";

interface SplitFieldsProps {
  form: EntryForm;
  target: Transaction | "new";
  groups: PickerGroup[];
  onChange: (fields: Partial<EntryForm>) => void;
}

// The parts of an entry split across categories; the rest stays in the main one
const SplitFields = ({ form, target, groups, onChange }: SplitFieldsProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const category = useCategoryName();
  const { rest } = entryFigures(state, form);
  const siblings =
    target !== "new" && target.splitId ? state.transactions.filter((tx) => tx.splitId === target.splitId) : [];
  // Changes one part of the split
  const setSplit = (index: number, fields: Partial<SplitDraft>) =>
    onChange({ splits: form.splits.map((split, at) => (at === index ? { ...split, ...fields } : split)) });

  let hint: string | undefined;
  if (form.splits.length > 0 && Number.isFinite(rest)) {
    hint = t("tx.split.rest", {
      amount: formatMoney(Math.max(0, rest), form.currency),
      category: category(state.categories.find((entry) => entry.id === form.categoryId)),
    });
  } else if (siblings.length > 1) {
    hint = t("tx.split.partOf", {
      n: siblings.length,
      total: formatMoney(splitTotalIn(state, siblings, form.currency), form.currency),
    });
  }

  // Adds an empty part to fill in
  const addPart = () => onChange({ splits: [...form.splits, { key: uid(), categoryId: "", amount: "" }] });

  // Nothing split yet: one quiet button instead of an empty section
  if (form.splits.length === 0 && !hint) {
    return (
      <Button variant="plain" size="sm" className={styles.splitStart} onClick={addPart}>
        <Icon name="plus" size={14} />
        {t("tx.split")}
      </Button>
    );
  }

  return (
    <FieldSet label={t("tx.split")} hint={hint}>
      <div className={styles.splits}>
        {form.splits.map((split, index) => (
          <div key={split.key} className={styles.split}>
            <OptionPicker
              label={t("common.category")}
              value={split.categoryId}
              onChange={(categoryId) => setSplit(index, { categoryId })}
              groups={groups}
            />
            <TextInput
              inputMode="decimal"
              placeholder="0"
              aria-label={t("common.amount")}
              value={split.amount}
              onChange={(event) => setSplit(index, { amount: event.target.value })}
            />
            <button
              type="button"
              aria-label={t("tx.split.remove")}
              onClick={() => onChange({ splits: form.splits.filter((_, at) => at !== index) })}
              className={styles.removeSplit}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addPart}>
          <Icon name="plus" size={14} />
          {t("tx.split.add")}
        </Button>
      </div>
    </FieldSet>
  );
};

export default SplitFields;
