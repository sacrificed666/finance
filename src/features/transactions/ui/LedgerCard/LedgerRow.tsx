"use client";

import { useStore } from "@/app/hooks";
import type { Transaction } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDateShort } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import Icon from "@/shared/ui/Icon/Icon";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import Money from "@/shared/ui/Money/Money";

import styles from "./LedgerCard.module.scss";

interface LedgerRowProps {
  tx: Transaction;
  showDate: boolean;
  selecting: boolean;
  ticked: boolean;
  compact?: boolean;
  onPress: (tx: Transaction) => void;
}

// One entry: what, where, details and the signed amount; ticked when picking
const LedgerRow = ({ tx, showDate, selecting, ticked, compact = false, onPress }: LedgerRowProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const category = useCategoryName();
  const entry = state.categories.find((item) => item.id === tx.categoryId);
  const parent = entry?.parentId ? state.categories.find((item) => item.id === entry.parentId) : undefined;
  const from = tx.accountId ? state.savings.find((account) => account.id === tx.accountId) : undefined;
  const to = tx.toAccountId ? state.savings.find((account) => account.id === tx.toAccountId) : undefined;
  const isTransfer = tx.type === "transfer";
  const typed = tx.note?.trim() ?? "";
  // A note that only repeats the category says nothing new
  const note = typed === category(entry) ? "" : typed;

  // The line under the title: a transfer's arrival, or date, path, account and tags
  const details = () => {
    if (isTransfer) {
      if (tx.toAmount !== undefined && to && tx.toAmount !== tx.amount) {
        return t("tx.arrivesAs", { amount: formatMoney(tx.toAmount, to.currency, { exact: true }) });
      }
      return tx.note ?? t("tx.type.transfer");
    }
    let path: string | null = null;
    if (note) path = parent && !compact ? `${category(parent)} › ${category(entry)}` : category(entry);
    else if (parent) path = category(parent);
    // A compact row keeps the date and the category
    if (compact) return [showDate ? formatDateShort(tx.date) : null, path].filter(Boolean).join(" · ");
    return [showDate ? formatDateShort(tx.date) : null, path, from?.name, tx.tags?.map((tag) => `#${tag}`).join(" ")]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <button
      type="button"
      onClick={() => onPress(tx)}
      aria-pressed={selecting ? ticked : undefined}
      className={cx(styles.row, selecting && ticked && styles.ticked)}
    >
      {selecting && (
        <span aria-hidden className={cx(styles.tick, ticked && styles.tickOn)}>
          <Icon name="check" size={13} strokeWidth={3} />
        </span>
      )}
      <IconDisc colorSlot={isTransfer ? undefined : entry?.colorSlot} size="lg">
        {isTransfer ? "⇄" : (entry?.icon ?? "❓")}
      </IconDisc>
      <span className={styles.body}>
        <span className={styles.title}>
          <span className={styles.titleText}>
            {isTransfer ? `${from?.name ?? "?"} → ${to?.name ?? "?"}` : note === "" ? category(entry) : note}
          </span>
          {tx.attachmentIds?.length ? (
            <span className={styles.receipt}>
              <Icon name="receipt" size={12} />
              <span className={styles.hidden}>{t("tx.receipt")}</span>
            </span>
          ) : null}
          {tx.splitId ? <span className={styles.splitBadge}>{t("tx.split.badge")}</span> : null}
          {tx.excluded ? <span className={styles.splitBadge}>{t("tx.excluded.badge")}</span> : null}
          {tx.unreviewed ? <span className={styles.newBadge}>{t("tx.review.badge")}</span> : null}
        </span>
        <span className={styles.meta}>{details()}</span>
      </span>
      <Money
        amount={tx.type === "expense" ? -tx.amount : tx.amount}
        currency={tx.currency}
        sign={!isTransfer}
        className={cx(styles.amount, isTransfer || tx.excluded ? styles.transfer : styles[tx.type])}
      />
    </button>
  );
};

export default LedgerRow;
