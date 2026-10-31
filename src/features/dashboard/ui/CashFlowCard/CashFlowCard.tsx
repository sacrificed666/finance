"use client";

import { useState } from "react";

import { useMonthSummary } from "@/features/dashboard/model/useMonthSummary";
import { historyMonths, monthlySeries } from "@/features/data/model/finmath";
import { useI18n } from "@/shared/i18n/useI18n";
import { chartSpan } from "@/shared/lib/chart";
import Card from "@/shared/ui/Card/Card";
import CardLink from "@/shared/ui/CardLink/CardLink";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";
import LinkButton from "@/shared/ui/LinkButton/LinkButton";
import MonthlyColumns from "@/shared/ui/MonthlyColumns/MonthlyColumns";
import PeriodTabs from "@/shared/ui/PeriodTabs/PeriodTabs";

// Income against spending month by month over the chosen period
const CashFlowCard = () => {
  const { state, base, month } = useMonthSummary();
  const { t } = useI18n();
  const [months, setMonths] = useState(12);
  const span = chartSpan(historyMonths(state.transactions, month), months);
  const series = monthlySeries(state.transactions, month, span.months, state.settings);

  return (
    <Card
      title={t("tx.flow")}
      icon="chart"
      action={
        <>
          {span.periods.length > 1 && <PeriodTabs value={span.value} onChange={setMonths} options={span.periods} />}
          <CardLink href="/reports" />
        </>
      }
    >
      {state.transactions.length > 0 ? (
        <MonthlyColumns
          data={series.map((entry) => ({ month: entry.month, income: entry.income, expense: entry.expense }))}
          currency={base}
          height={190}
        />
      ) : (
        <EmptyState
          icon={<Icon name="chart" />}
          title={t("dash.chart.empty")}
          hint={t("dash.chart.empty.hint")}
          action={
            <LinkButton href="/transactions" variant="ghost">
              {t("dash.addTransaction")}
            </LinkButton>
          }
        />
      )}
    </Card>
  );
};

export default CashFlowCard;
