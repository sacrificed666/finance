"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import type { AppState } from "@/features/data/model/types";
import { recordTaxPayments, taxDeducted, type TaxObligation } from "@/features/income/model/taxCalendar";
import { usePeriodLabel } from "@/features/income/model/usePeriodLabel";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import DateField from "@/shared/ui/DateField/DateField";
import Sheet from "@/shared/ui/Sheet/Sheet";
import Switch from "@/shared/ui/Switch/Switch";
import SwitchRow from "@/shared/ui/SwitchRow/SwitchRow";

import styles from "./TaxPaidSheet.module.scss";

interface TaxPaidSheetProps {
  obligations: readonly TaxObligation[];
  label?: string;
  onClose: () => void;
}

interface Payment {
  paid: boolean;
  date: string;
}

// Whether a date is a whole day that has come
const goodDay = (date: string, today: string) => /^\d{4}-\d{2}-\d{2}$/u.test(date) && date <= today;

// Each payment paid on a day of its own, booked as an expense only if asked
const TaxPaidSheet = ({ obligations, label, onClose }: TaxPaidSheetProps) => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const periodLabel = usePeriodLabel();
  const today = todayISO();
  const deducted = obligations.some((item) => taxDeducted(state, item));
  const [book, setBook] = useState(!deducted);
  const [payments, setPayments] = useState<Record<string, Payment>>(() =>
    Object.fromEntries(
      obligations.map((item) => [item.id, { paid: true, date: state.settings.taxPaid?.[item.id] ?? today }]),
    ),
  );
  const total = obligations.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  // The name of an obligation with its period
  const name = (item: TaxObligation) => t(`taxcal.${item.kind}`, { period: periodLabel(item.period) });
  const [first] = obligations;
  const title = label ?? (first ? name(first) : "");
  const valid = Object.values(payments).every((payment) => !payment.paid || goodDay(payment.date, today));
  // Changes one payment and keeps the rest
  const set = (id: string, fields: Partial<Payment>) =>
    setPayments((all) => ({ ...all, [id]: { paid: true, date: today, ...all[id], ...fields } }));

  // Books each payment on its own day, or takes it back, with one undo
  const save = () => {
    if (!valid) return;
    update(
      (s) =>
        obligations.reduce<AppState>((next, item) => {
          const payment = payments[item.id];
          if (payment?.paid) return recordTaxPayments(next, [item], true, payment.date, name, book);
          return next.settings.taxPaid?.[item.id] ? recordTaxPayments(next, [item], false, today, name) : next;
        }, s),
      t("taxcal.paidToast", { name: title }),
    );
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      onSubmit={save}
      problem={valid ? null : t("taxcal.problem.date")}
      title={t("taxcal.markPaid")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!valid}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <ul className={styles.items}>
        {obligations.map((item) => {
          const payment = payments[item.id] ?? { paid: true, date: today };
          return (
            <li key={item.id} className={styles.item}>
              <div className={styles.head}>
                <span className={styles.name}>{name(item)}</span>
                {item.amount !== undefined && <span className={styles.amount}>{formatMoney(item.amount, "UAH")}</span>}
                {obligations.length > 1 && (
                  <Switch checked={payment.paid} onChange={(paid) => set(item.id, { paid })} label={name(item)} />
                )}
              </div>
              {payment.paid && (
                <label className={styles.day}>
                  <span className={styles.dayLabel}>{t("taxcal.paidOn")}</span>
                  <DateField max={today} value={payment.date} onChange={(value) => set(item.id, { date: value })} />
                </label>
              )}
            </li>
          );
        })}
      </ul>
      {total > 0.5 && (
        <SwitchRow
          title={t("taxcal.bookExpense")}
          hint={deducted ? t("taxcal.bookExpense.deducted") : t("taxcal.bookExpense.hint")}
          checked={book}
          onChange={setBook}
        />
      )}
    </Sheet>
  );
};

export default TaxPaidSheet;
