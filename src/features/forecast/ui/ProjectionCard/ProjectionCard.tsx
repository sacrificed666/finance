"use client";

import type { Forecast } from "@/features/forecast/model/forecast";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonthShort } from "@/shared/lib/date";
import { formatPercent } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import StackedArea from "@/shared/ui/StackedArea/StackedArea";

import styles from "./ProjectionCard.module.scss";

interface ProjectionCardProps {
  f: Forecast;
  years: number;
  returnPct: number;
  inflationOn: boolean;
  withDebts: boolean;
}

// Savings and investments stacked month by month to the horizon
const ProjectionCard = ({ f, years, returnPct, inflationOn, withDebts }: ProjectionCardProps) => {
  const { t } = useI18n();
  const yearly = years >= 3;
  return (
    <Card title={t("forecast.projection", { currency: f.view })} icon="trend">
      <StackedArea
        points={f.points}
        currency={f.view}
        rangeLabel={t("forecast.spread")}
        height={280}
        xTickEvery={yearly ? 12 : 3}
        xTickFormat={(label) => (yearly ? label.slice(0, 4) : formatMonthShort(label))}
      />
      <p className={styles.footnote}>
        {t("forecast.footnote", { pct: formatPercent(returnPct) })}
        {inflationOn && ` ${t("forecast.footnoteReal")}`}
        {withDebts && f.state.debts.length > 0 && ` ${t("forecast.footnoteDebts")}`}
      </p>
    </Card>
  );
};

export default ProjectionCard;
