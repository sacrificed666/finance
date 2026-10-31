"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { historyMonths, monthlySeries, taxPaid } from "@/features/data/model/finmath";
import { useI18n } from "@/shared/i18n/useI18n";
import { chartSpan } from "@/shared/lib/chart";
import { currentMonth } from "@/shared/lib/date";
import Card from "@/shared/ui/Card/Card";
import MonthlyColumns from "@/shared/ui/MonthlyColumns/MonthlyColumns";
import PeriodTabs from "@/shared/ui/PeriodTabs/PeriodTabs";

// Each month's income in columns, tax on top; away until there is income
const IncomeByMonthCard = () => {
  const { state } = useStore();
  const { t } = useI18n();
  const [months, setMonths] = useState(12);
  const { settings } = state;
  const hasIncome = state.transactions.some((tx) => tx.type === "income");
  const hasTax = state.transactions.some((tx) => tx.type === "income" && tx.tax);
  if (!hasIncome) return null;
  const month = currentMonth();
  const span = chartSpan(historyMonths(state.transactions, month, "income"), months);
  const data = monthlySeries(state.transactions, month, span.months, settings).map((entry) => {
    const withheld = taxPaid(state.transactions, entry.month, entry.month, settings);
    return { month: entry.month, income: entry.income, expense: entry.expense, tax: withheld.tax + withheld.vat };
  });

  return (
    <Card
      title={t("income.byMonth")}
      subtitle={hasTax ? t("income.byMonth.taxSubtitle") : t("income.byMonth.subtitle")}
      icon="chart"
      action={span.periods.length > 1 && <PeriodTabs value={span.value} onChange={setMonths} options={span.periods} />}
    >
      <MonthlyColumns data={data} currency={settings.baseCurrency} height={196} incomeOnly />
    </Card>
  );
};

export default IncomeByMonthCard;
