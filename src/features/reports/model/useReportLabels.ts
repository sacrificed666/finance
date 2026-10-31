"use client";

import { useStore } from "@/app/hooks";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { usePeriodLabel } from "@/features/income/model/usePeriodLabel";
import { formatMonthCompact, formatMonthShort } from "@/shared/lib/date";

import { periodKey, type ReportPeriod } from "./report";

// The names a report shows: of its periods and of its categories
export const useReportLabels = () => {
  const { state } = useStore();
  const periodLabel = usePeriodLabel();
  const category = useCategoryName();
  const categories = new Map(state.categories.map((entry) => [entry.id, entry]));
  return {
    // A period by its month, its quarter, its year or its first and last months
    periodName: (period: ReportPeriod, start: string, end = start) => {
      if (period !== "custom" || start === end)
        return periodLabel(periodKey(period === "custom" ? "month" : period, start));
      const from = start.slice(0, 4) === end.slice(0, 4) ? formatMonthShort(start) : formatMonthCompact(start);
      return `${from} - ${formatMonthCompact(end)}`;
    },
    // A category's emoji, name and colour
    categoryMark: (id: string) => {
      const entry = categories.get(id);
      return { icon: entry?.icon ?? "❓", name: category(entry), slot: entry?.colorSlot };
    },
  };
};
