"use client";

import type { Report } from "@/features/reports/model/report";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonthShort } from "@/shared/lib/date";
import { formatPercent } from "@/shared/lib/money";
import BarRow from "@/shared/ui/BarRow/BarRow";
import Card from "@/shared/ui/Card/Card";

interface KeptCardProps {
  year: Report["year"];
  month: string;
}

// The share of income each month kept, the period's own month in bold
const KeptCard = ({ year, month }: KeptCardProps) => {
  const { t } = useI18n();
  const first = year.findIndex((entry) => entry.income > 0);
  const months = first === -1 ? [] : year.slice(first);
  const rates = months.map((entry) => (entry.income > 0 ? ((entry.income - entry.expense) / entry.income) * 100 : 0));
  const earning = months.filter((entry) => entry.income > 0).length;
  if (earning < 2) return null;
  const average = rates.reduce((sum, rate) => sum + rate, 0) / earning;
  return (
    <Card
      title={t("reports.keptMonthly")}
      subtitle={t("reports.keptMonthly.subtitle", { pct: formatPercent(average, 0) })}
      icon="percent"
    >
      <BarRow
        caption={t("reports.keptMonthly")}
        columns={[t("chart.point"), t("dash.savingsRate")]}
        bars={months.map((entry, index) => ({
          key: entry.month,
          label: formatMonthShort(entry.month),
          value: rates[index] ?? 0,
          display: entry.income > 0 ? formatPercent(rates[index] ?? 0, 0) : "-",
          strong: entry.month === month,
        }))}
      />
    </Card>
  );
};

export default KeptCard;
