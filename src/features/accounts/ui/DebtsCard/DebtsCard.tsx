"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { DEBT_SORTS, debtSchedule, debtSortKey, type DebtSort } from "@/features/accounts/model/debts";
import PayoffSheet from "@/features/accounts/ui/PayoffSheet/PayoffSheet";
import type { Debt } from "@/features/data/model/types";
import { instalmentProgress } from "@/features/transactions/model/recurring";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import { currentMonth, formatMonthText, todayISO } from "@/shared/lib/date";
import { oneOf, sortItems, type SortDirection, LIST_TOOLS_AT } from "@/shared/lib/listing";
import { formatMoney } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import SortSelect from "@/shared/ui/SortSelect/SortSelect";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";
import Unit from "@/shared/ui/Unit/Unit";

import DebtRow from "./DebtRow";
import InstalmentRow from "./InstalmentRow";

import styles from "./DebtsCard.module.scss";

interface DebtsCardProps {
  onAdd: () => void;
  onEdit: (debt: Debt) => void;
}

// The debts with their payoff and planner, and purchases still paid in parts
const DebtsCard = ({ onAdd, onEdit }: DebtsCardProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const base = state.settings.baseCurrency;
  const month = currentMonth();
  const [sort, setSort] = usePersistentState<DebtSort>("debt.sort", "balance", oneOf(DEBT_SORTS));
  const [direction, setDirection] = usePersistentState<SortDirection>("debt.dir", "desc", oneOf(["asc", "desc"]));
  const [planning, setPlanning] = useState(false);
  const today = todayISO();
  // Purchases paid in parts that still have payments to come
  const instalments = state.recurring.filter((rule) => (instalmentProgress(state, rule, today)?.left ?? 0) > 0.005);
  if (state.debts.length === 0 && instalments.length === 0) return null;

  const schedule = debtSchedule(state, month);
  const visible = sortItems(state.debts, (debt) => debtSortKey(state, debt, sort, month), direction);
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, base, { compact: true });

  return (
    <Card
      title={t("balance.debts")}
      subtitle={tp("balance.debts.subtitle", state.debts.length + instalments.length)}
      icon="debt"
      action={
        <div className={styles.actions}>
          {state.debts.length >= LIST_TOOLS_AT && (
            <SortSelect<DebtSort>
              value={sort}
              onChange={setSort}
              options={[
                { value: "balance", label: t("sort.balance") },
                { value: "rate", label: t("sort.rate") },
                { value: "payoff", label: t("sort.payoff") },
                { value: "name", label: t("sort.name") },
              ]}
              direction={direction}
              onDirectionChange={setDirection}
            />
          )}
          <AddButton size="sm" onClick={onAdd} label={t("common.add")} />
        </div>
      }
    >
      {state.debts.length > 1 && schedule.payment > 0 && (
        <SummaryPanel
          className={styles.summary}
          value={
            <>
              {money(schedule.payment)}
              <Unit>{t("common.perMonth")}</Unit>
            </>
          }
          tone="expense"
        >
          {(schedule.lastMonth !== "" || schedule.interest > 0.5) && (
            <p className={styles.schedule}>
              {[
                schedule.lastMonth
                  ? t("balance.debt.lastPayment", { month: formatMonthText(schedule.lastMonth) })
                  : null,
                schedule.interest > 0.5 ? t("balance.debt.interestToPay", { amount: money(schedule.interest) }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </SummaryPanel>
      )}
      <div className={styles.rows}>
        {visible.map((debt) => (
          <DebtRow key={debt.id} debt={debt} month={month} onEdit={onEdit} />
        ))}
        {instalments.map((rule) => (
          <InstalmentRow key={rule.id} rule={rule} />
        ))}
      </div>
      {state.debts.length > 0 && (
        <Button variant="ghost" size="sm" className={styles.plan} onClick={() => setPlanning(true)}>
          {t("payoff.open")}
        </Button>
      )}
      {planning && <PayoffSheet onClose={() => setPlanning(false)} />}
    </Card>
  );
};

export default DebtsCard;
