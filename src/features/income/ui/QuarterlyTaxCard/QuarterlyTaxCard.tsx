"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { taxYearValues } from "@/features/income/model/tax";
import {
  declarationFigures,
  hasTaxCalendar,
  incomeBook,
  incomeBookCsv,
  quarterRows,
  taxObligations,
  type QuarterRow,
  type RateOf,
} from "@/features/income/model/taxCalendar";
import { useNbuRates } from "@/features/income/model/useNbuRates";
import { usePeriodLabel } from "@/features/income/model/usePeriodLabel";
import TaxPaidSheet from "@/features/income/ui/TaxPaidSheet/TaxPaidSheet";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDate, formatDateShort, todayISO } from "@/shared/lib/date";
import { downloadFile } from "@/shared/lib/download";
import { formatMoney } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import Fact from "@/shared/ui/Fact/Fact";
import Facts from "@/shared/ui/Facts/Facts";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./QuarterlyTaxCard.module.scss";

// A short sum in hryvnias, or a dash for nothing
const money = (value: number) => (value > 0.5 ? formatMoney(value, "UAH", { compact: true }) : "-");

// The year's quarters to mark paid, the declaration and the income book
const QuarterlyTaxCard = () => {
  const { state } = useStore();
  const { t } = useI18n();
  const periodLabel = usePeriodLabel();
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const regime = state.settings.tax.regime;
  const taxed = state.transactions.filter((tx) => tx.type === "income" && tx.tax && tx.date.startsWith(String(year)));
  const foreignDays = [
    ...new Set(
      taxed.filter((tx) => tx.currency !== "UAH" && tx.date <= today).map((tx) => `${tx.currency}:${tx.date}`),
    ),
  ];
  const nbu = useNbuRates(foreignDays);
  const [paying, setPaying] = useState<QuarterRow | null>(null);
  if (!hasTaxCalendar(regime)) return null;

  // The NBU rate of a currency on a day, or the app's current rate without one
  const rateOf: RateOf = (currency, date) =>
    currency === "UAH" ? 1 : (nbu.get(`${currency}:${date}`) ?? state.settings.rates[currency]);
  const rows = quarterRows(state, year, rateOf);
  const hasVat = rows.some((row) => row.vat > 0);
  const { esv } = state.settings.tax;
  const yearDeclaration = taxObligations(state, year).find(
    (item) => item.kind === "declaration" && (item.period === `${String(year)}-Q4` || item.period === String(year)),
  );
  // Opens the quarter's payments, each to mark paid on its own day or not
  const toggle = (row: QuarterRow) => setPaying(row);
  // When a paid quarter was paid, from its first payment
  const paidOn = (row: QuarterRow) => {
    const [first] = row.payments;
    const day = first ? state.settings.taxPaid?.[first.id] : undefined;
    return day ? t("taxcal.paidOnDate", { date: formatDateShort(day) }) : undefined;
  };
  // Downloads the year's income book for the tax office
  const downloadBook = () =>
    downloadFile(
      `income-book-${String(year)}.csv`,
      incomeBookCsv(incomeBook(state, year, rateOf)),
      "text/csv;charset=utf-8",
    );
  const lastQuarter = Math.floor((Number(today.slice(5, 7)) - 1) / 3);
  const declaration = lastQuarter > 0 ? declarationFigures(state, year, lastQuarter, rateOf) : null;
  const figures = taxYearValues(year);

  return (
    <Card title={t("taxcal.quarterly")} subtitle={t("taxcal.quarterly.subtitle", { year })} icon="calendar">
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.left}>{t("taxcal.col.quarter")}</th>
              <th className={styles.right}>{t("taxcal.col.income")}</th>
              <th className={cx(styles.right, styles.narrowOnly)}>{t("taxcal.col.taxes")}</th>
              <th className={cx(styles.right, styles.wideOnly)}>{t("taxcal.col.single")}</th>
              <th className={cx(styles.right, styles.wideOnly)}>{t("taxcal.col.levy")}</th>
              {esv && <th className={cx(styles.right, styles.wideOnly)}>{t("taxcal.col.esv")}</th>}
              {hasVat && <th className={cx(styles.right, styles.wideOnly)}>{t("taxcal.col.vat")}</th>}
              <th className={cx(styles.right, styles.paidColumn)}>{t("taxcal.col.paid")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.period}>
                <td className={styles.quarter}>{t("taxcal.quarter", { q: row.quarter, year })}</td>
                <td className={cx(styles.figure, styles.strong)}>{money(row.gross)}</td>
                <td className={cx(styles.figure, styles.narrowOnly)}>
                  {money(row.single + row.levy + row.esv + row.vat)}
                </td>
                <td className={cx(styles.figure, styles.wideOnly)}>{money(row.single)}</td>
                <td className={cx(styles.figure, styles.wideOnly)}>{money(row.levy)}</td>
                {esv && <td className={cx(styles.figure, styles.wideOnly)}>{money(row.esv)}</td>}
                {hasVat && <td className={cx(styles.figure, styles.wideOnly)}>{money(row.vat)}</td>}
                <td className={styles.right}>
                  <button
                    type="button"
                    onClick={() => toggle(row)}
                    aria-pressed={row.settled}
                    title={row.settled ? paidOn(row) : t("taxcal.markPaid")}
                    className={cx(styles.settle, row.settled ? styles.settled : styles.open)}
                  >
                    {row.settled && <Icon name="check" size={12} strokeWidth={2.6} />}
                    {row.settled ? t("taxcal.paid") : t("taxcal.notYet")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {declaration && declaration.incomeToDate > 0 && (
        <div className={styles.declaration}>
          <p className={styles.declarationTitle}>
            {t("taxcal.decl.title", { period: periodLabel(`${String(year)}-Q${String(declaration.quarter)}`) })}
          </p>
          <Facts>
            <Fact label={t("taxcal.decl.income")}>{formatMoney(declaration.incomeToDate, "UAH")}</Fact>
            <Fact label={t("taxcal.decl.single")}>{formatMoney(declaration.singleToDate, "UAH")}</Fact>
            <Fact label={t("taxcal.decl.levy")}>{formatMoney(declaration.levyToDate, "UAH")}</Fact>
            <Fact label={t("taxcal.decl.quarter")}>
              {formatMoney(declaration.singleThisQuarter + declaration.levyThisQuarter, "UAH")}
            </Fact>
          </Facts>
        </div>
      )}
      <div className={styles.book}>
        <p className={styles.bookHint}>{t("taxcal.book.hint")}</p>
        <Button variant="ghost" size="sm" onClick={downloadBook} disabled={taxed.length === 0}>
          <Icon name="arrowDown" size={14} />
          {t("taxcal.book")}
        </Button>
      </div>
      {!figures.known && <p className={styles.unknown}>{t("tax.yearUnknown", { year, used: figures.year })}</p>}
      <p className={styles.footnote}>
        {foreignDays.length > 0 ? `${t("taxcal.nbuNote")} ` : ""}
        {yearDeclaration && t("taxcal.declared", { date: formatDate(yearDeclaration.due) })}
      </p>
      {paying && (
        <TaxPaidSheet
          obligations={paying.payments}
          label={t("taxcal.quarter", { q: paying.quarter, year })}
          onClose={() => setPaying(null)}
        />
      )}
    </Card>
  );
};

export default QuarterlyTaxCard;
