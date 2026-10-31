"use client";

import { useStore } from "@/app/hooks";
import { receivablesTotal } from "@/features/data/model/finmath";
import type { Receivable } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import { sortItems } from "@/shared/lib/listing";
import { formatMoney } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Card from "@/shared/ui/Card/Card";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";

import ReceivableRow from "./ReceivableRow";

import styles from "./ReceivablesCard.module.scss";

interface ReceivablesCardProps {
  onAdd: () => void;
  onEdit: (receivable: Receivable) => void;
}

// The money lent to others: what is still owed, the late ones first after the open
const ReceivablesCard = ({ onAdd, onEdit }: ReceivablesCardProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const base = state.settings.baseCurrency;
  const today = todayISO();
  if (state.receivables.length === 0) return null;
  const outstanding = receivablesTotal(state);
  const overdue = state.receivables.filter((item) => item.repaid < item.amount && item.dueDate && item.dueDate < today);
  const rows = sortItems(
    state.receivables,
    (item) => `${item.repaid >= item.amount ? 1 : 0}|${item.dueDate ?? "9999"}|${item.date}`,
    "asc",
  );

  return (
    <Card
      title={t("receivables.title")}
      subtitle={t("receivables.subtitle", { amount: formatMoney(outstanding, base, { compact: true }) })}
      icon="user"
      action={<AddButton size="sm" onClick={onAdd} label={t("common.add")} />}
    >
      {rows.length > 1 && (
        <SummaryPanel
          className={styles.summary}
          value={formatMoney(outstanding, base, { compact: true })}
          tone={outstanding > 0 ? "income" : undefined}
          meta={
            overdue.length > 0 ? (
              <span className={styles.overdue}>{t("receivables.overdueCount", { n: overdue.length })}</span>
            ) : undefined
          }
        />
      )}
      <ul className={styles.rows}>
        {rows.map((item) => (
          <ReceivableRow key={item.id} receivable={item} today={today} onEdit={onEdit} />
        ))}
      </ul>
    </Card>
  );
};

export default ReceivablesCard;
