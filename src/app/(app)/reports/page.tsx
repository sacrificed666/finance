import {
  REPORT_COMPARES,
  REPORT_PERIODS,
  type ReportCompare,
  type ReportPeriod,
} from "@/features/reports/model/report";
import ReportsPage from "@/features/reports/ui/ReportsPage/ReportsPage";
import { titled } from "@/shared/i18n/server";

export const generateMetadata = titled("nav.reports");

type Param = string | string[] | undefined;

interface PageProps {
  searchParams: Promise<Record<"month" | "period" | "compare" | "from" | "to", Param>>;
}

// A month in the address worth opening at: a real one, not after this one
const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;

// A month the address names, or nothing
const monthOf = (value: Param): string | undefined =>
  typeof value === "string" && MONTH.test(value) ? value : undefined;

// A value the address names when it is one of the choices
const oneOf = <T extends string>(choices: readonly T[], value: Param): T | undefined =>
  choices.find((choice) => choice === value);

// The reports page with the period, range and comparison its address names
const Page = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  const from = monthOf(params.from);
  const to = monthOf(params.to);
  const period: ReportPeriod | undefined = oneOf(REPORT_PERIODS, params.period);
  const compare: ReportCompare | undefined = oneOf(REPORT_COMPARES, params.compare);
  return (
    <ReportsPage
      month={monthOf(params.month)}
      period={period}
      compare={compare}
      range={from && to ? { from, to } : undefined}
    />
  );
};

export default Page;
