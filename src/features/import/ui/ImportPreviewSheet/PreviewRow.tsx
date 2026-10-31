"use client";

import { useStore } from "@/app/hooks";
import type { ImportCandidate } from "@/features/import/model/import";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDateShort } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import Badge from "@/shared/ui/Badge/Badge";
import type { PickerGroup } from "@/shared/ui/OptionPicker/OptionPicker";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";

import styles from "./ImportPreviewSheet.module.scss";

interface PreviewRowProps {
  candidate: ImportCandidate;
  on: boolean;
  groups: PickerGroup[];
  onToggle: (on: boolean) => void;
  onCategory: (categoryId: string) => void;
}

// The colour of an operation's amount by its type
const TONE = { income: styles.income, transfer: styles.neutral, expense: styles.expense };

// An operation to import: tick, description, category or transfer, amount
const PreviewRow = ({ candidate: c, on, groups, onToggle, onCategory }: PreviewRowProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  // An account's name, or a question mark
  const accountName = (id: string | undefined) => state.savings.find((account) => account.id === id)?.name ?? "?";
  const toCurrency = state.savings.find((account) => account.id === c.toAccountId)?.currency ?? c.currency;
  return (
    <li className={cx(styles.row, !on && styles.off)}>
      <input
        type="checkbox"
        checked={on}
        onChange={(event) => onToggle(event.target.checked)}
        aria-label={c.description || formatDateShort(c.date)}
        className={styles.tick}
      />
      <span className={styles.what}>
        <span className={styles.description}>{c.description || "-"}</span>
        <span className={styles.meta}>
          {formatDateShort(c.date)}
          {c.mcc ? ` · MCC ${String(c.mcc)}` : ""}
          {c.duplicate && <Badge>{t("import.already")}</Badge>}
          {c.planned && <Badge tone="accent">{t("import.planned", { name: c.planned.label })}</Badge>}
        </span>
      </span>
      <span className={styles.category}>
        {c.type === "transfer" ? (
          <span className={styles.transferLabel}>
            <span aria-hidden>⇄</span>
            <span className={styles.accounts}>
              {t("import.transfer", { from: accountName(c.accountId), to: accountName(c.toAccountId) })}
            </span>
          </span>
        ) : (
          <OptionPicker
            size="sm"
            label={t("common.category")}
            value={c.categoryId}
            onChange={onCategory}
            groups={groups}
          />
        )}
      </span>
      <span className={cx(styles.amount, TONE[c.type])}>
        {c.type === "transfer"
          ? formatMoney(c.amount, c.currency)
          : formatMoney(c.type === "income" ? c.amount : -c.amount, c.currency, { sign: true })}
        {c.type === "transfer" && c.toAmount !== undefined && (
          <span className={styles.toAmount}>→ {formatMoney(c.toAmount, toCurrency)}</span>
        )}
      </span>
    </li>
  );
};

export default PreviewRow;
