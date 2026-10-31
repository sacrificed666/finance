"use client";

import { useDeferredValue, useState } from "react";

import { useStore } from "@/app/hooks";
import { reportCsv } from "@/features/reports/model/export";
import {
  categoryChanges,
  type MonthRange,
  orderedRange,
  PERIOD_MONTHS,
  periodKey,
  periodStart,
  REPORT_COMPARES,
  REPORT_PERIODS,
  report,
  type ReportCompare,
  type ReportPeriod,
} from "@/features/reports/model/report";
import { useReportLabels } from "@/features/reports/model/useReportLabels";
import AccountsSpentCard from "@/features/reports/ui/AccountsSpentCard/AccountsSpentCard";
import ComparedCard from "@/features/reports/ui/ComparedCard/ComparedCard";
import FixedCard from "@/features/reports/ui/FixedCard/FixedCard";
import FlowCard from "@/features/reports/ui/FlowCard/FlowCard";
import KeptCard from "@/features/reports/ui/KeptCard/KeptCard";
import LargestCard from "@/features/reports/ui/LargestCard/LargestCard";
import PeriodStepper from "@/features/reports/ui/ReportsHero/PeriodStepper";
import ReportsHero from "@/features/reports/ui/ReportsHero/ReportsHero";
import TagsCard from "@/features/reports/ui/TagsCard/TagsCard";
import TrendsCard from "@/features/reports/ui/TrendsCard/TrendsCard";
import YearReviewCard from "@/features/reports/ui/YearReviewCard/YearReviewCard";
import { useI18n } from "@/shared/i18n/useI18n";
import { addMonths, currentMonth, todayISO } from "@/shared/lib/date";
import { downloadFile } from "@/shared/lib/download";
import Button from "@/shared/ui/Button/Button";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import Icon from "@/shared/ui/Icon/Icon";
import MonthInput from "@/shared/ui/MonthInput/MonthInput";
import PageBody from "@/shared/ui/PageBody/PageBody";
import PageHeader from "@/shared/ui/PageHeader/PageHeader";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Split from "@/shared/ui/Split/Split";

import styles from "./ReportsPage.module.scss";

interface ReportsPageProps {
  month?: string;
  period?: ReportPeriod;
  compare?: ReportCompare;
  range?: MonthRange;
}

interface ReportChoice {
  period: ReportPeriod;
  anchor: string;
  compare: ReportCompare;
  range: MonthRange;
}

// Writes the report's choices into the address for reloads and bookmarks
const rememberChoice = ({ period, anchor, compare, range }: ReportChoice) => {
  const params = new URLSearchParams();
  if (period !== "month") params.set("period", period);
  if (period === "custom") {
    params.set("from", range.from);
    params.set("to", range.to);
  } else if (anchor !== currentMonth()) {
    params.set("month", anchor);
  }
  if (compare !== "previous") params.set("compare", compare);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `/reports?${query}` : "/reports");
};

// The reports page: a period against the one before or a year earlier
const ReportsPage = ({ month, period: openedPeriod, compare: openedCompare, range: openedRange }: ReportsPageProps) => {
  const { state } = useStore();
  const i18n = useI18n();
  const { t } = i18n;
  const { periodName, categoryMark } = useReportLabels();
  const base = state.settings.baseCurrency;
  const [choice, setChoice] = useState<ReportChoice>(() => ({
    period: openedPeriod ?? "month",
    anchor: month && month <= currentMonth() ? month : currentMonth(),
    compare: openedCompare ?? "previous",
    range: openedRange ? orderedRange(openedRange) : { from: addMonths(currentMonth(), -5), to: currentMonth() },
  }));
  const { period, anchor, compare, range } = choice;
  // Changes some of the choices and keeps them in the address
  const choose = (fields: Partial<ReportChoice>) => {
    const next = { ...choice, ...fields };
    setChoice(next);
    rememberChoice(next);
  };
  const shownPeriod = useDeferredValue(period);
  const shownAnchor = useDeferredValue(anchor);
  const shownRange = useDeferredValue(range);
  const r = report(state, shownPeriod, shownAnchor, todayISO(), { compare, range: shownRange });
  const changes = categoryChanges(r);
  const spent = changes.filter((entry) => entry.value > 0);
  const current = periodName(shownPeriod, r.start, r.end);
  const previous = periodName(shownPeriod, r.prevStart, r.prevEnd);
  const custom = period === "custom";
  const chosenStart = periodStart(period, anchor);
  const stepMonths = PERIOD_MONTHS[custom ? "month" : period];

  // Moves to the period before or after
  const step = (direction: 1 | -1) => choose({ anchor: addMonths(chosenStart, direction * stepMonths) });
  // Moves one end of the range, keeping it in order and at most ten years long
  const moveRange = (next: MonthRange) => choose({ range: orderedRange(next) });

  // Downloads the report as a spreadsheet
  const exportCsv = () => {
    const csv = reportCsv(
      changes.map((entry) => ({ label: categoryMark(entry.id).name, current: entry.value, previous: entry.before })),
      {
        income: { label: t("export.row.income"), current: r.current.income, previous: r.previous.income },
        expense: { label: t("export.row.expense"), current: r.current.expense, previous: r.previous.expense },
        net: { label: t("export.row.net"), current: r.current.net, previous: r.previous.net },
      },
      { current, previous },
      base,
      i18n,
    );
    downloadFile(`report-${periodKey(shownPeriod, r.start, r.end)}.csv`, csv, "text/csv;charset=utf-8");
  };

  return (
    <>
      <PageHeader
        title={t("nav.reports")}
        action={
          <div className={styles.actions}>
            <SegmentedControl<ReportPeriod>
              label={t("reports.period")}
              options={REPORT_PERIODS.map((value) => ({ value, label: t(`reports.period.${value}`) }))}
              value={period}
              onChange={(next) => choose({ period: next })}
              fit
            />
            <SegmentedControl<ReportCompare>
              label={t("reports.compare")}
              options={REPORT_COMPARES.map((value) => ({ value, label: t(`reports.compare.${value}`) }))}
              value={compare}
              onChange={(next) => choose({ compare: next })}
              fit
            />
            <div className={styles.exports}>
              <Button variant="ghost" aria-label="CSV" onClick={exportCsv} className={styles.export}>
                <Icon name="arrowDown" size={14} />
                <span className={styles.exportLabel}>CSV</span>
              </Button>
              <Button
                variant="ghost"
                aria-label="PDF"
                title={t("export.pdfHint")}
                onClick={() => window.print()}
                className={styles.export}
              >
                <Icon name="receipt" size={14} />
                <span className={styles.exportLabel}>PDF</span>
              </Button>
            </div>
          </div>
        }
      />
      <PageBody>
        {custom && (
          <div className={styles.range}>
            <FieldSet label={t("reports.range.from")}>
              <MonthInput
                name={t("reports.range.from")}
                value={range.from}
                onChange={(from) => moveRange({ ...range, from })}
              />
            </FieldSet>
            <FieldSet label={t("reports.range.to")}>
              <MonthInput
                name={t("reports.range.to")}
                value={range.to}
                onChange={(to) => moveRange({ ...range, to })}
              />
            </FieldSet>
          </div>
        )}
        <ReportsHero
          r={r}
          previous={previous}
          action={
            custom ? undefined : (
              <PeriodStepper
                label={periodName(period, chosenStart)}
                atLatest={chosenStart >= periodStart(period, currentMonth())}
                onStep={step}
              />
            )
          }
        />
        <Split
          main={
            <>
              <FlowCard r={r} period={current} currency={base} />
              <ComparedCard
                changes={changes}
                current={current}
                previous={previous}
                currency={base}
                sameDay={r.inProgress}
              />
              <TrendsCard r={r} spent={spent} currency={base} />
            </>
          }
          side={
            <>
              <KeptCard year={r.year} month={r.end} />
              <FixedCard r={r} currency={base} />
              <AccountsSpentCard byAccount={r.current.byAccount} period={current} currency={base} />
              <LargestCard largest={r.largest} period={current} />
              <TagsCard byTag={r.current.byTag} period={current} currency={base} />
              {period === "year" && <YearReviewCard year={r.year} period={current} currency={base} />}
            </>
          }
        />
      </PageBody>
    </>
  );
};

export default ReportsPage;
