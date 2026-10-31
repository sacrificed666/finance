"use client";

import type { Receivable } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDate } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import styles from "./ReceivablesCard.module.scss";

interface ReceivableRowProps {
  receivable: Receivable;
  today: string;
  onEdit: (receivable: Receivable) => void;
}

// One loan: who owes, when it is due or late, what is left and what came back
const ReceivableRow = ({ receivable, today, onEdit }: ReceivableRowProps) => {
  const { t } = useI18n();
  const settled = receivable.repaid >= receivable.amount;
  const late = !settled && receivable.dueDate !== undefined && receivable.dueDate < today;
  const repaid = t("receivables.repaidOf", {
    repaid: formatMoney(receivable.repaid, receivable.currency, { compact: true }),
    amount: formatMoney(receivable.amount, receivable.currency, { compact: true }),
  });
  let status = t("receivables.lentOn", { date: formatDate(receivable.date) });
  if (settled) status = t("receivables.settled");
  else if (late && receivable.dueDate) status = t("receivables.overdue", { date: formatDate(receivable.dueDate) });
  else if (receivable.dueDate) status = t("receivables.dueOn", { date: formatDate(receivable.dueDate) });

  return (
    <li>
      <button type="button" onClick={() => onEdit(receivable)} className={cx(styles.row, settled && styles.settled)}>
        <span className={styles.line}>
          <IconDisc colorSlot={late ? 13 : 4} size="lg">
            {receivable.icon}
          </IconDisc>
          <span className={styles.body}>
            <span className={styles.name}>{receivable.name}</span>
            <span className={cx(styles.status, late && styles.late)}>{status}</span>
          </span>
          <span className={styles.left}>
            {formatMoney(Math.max(0, receivable.amount - receivable.repaid), receivable.currency, { compact: true })}
          </span>
        </span>
        {receivable.repaid > 0 && !settled && (
          <span className={styles.progress}>
            <ProgressMeter value={receivable.repaid} max={receivable.amount} label={repaid} />
            <span className={styles.repaid}>{repaid}</span>
          </span>
        )}
      </button>
    </li>
  );
};

export default ReceivableRow;
