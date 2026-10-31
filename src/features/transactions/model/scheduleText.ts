import type { Frequency } from "@/features/data/model/types";
import type { I18n } from "@/shared/i18n/translate";
import { dateInMonth, formatDateShort, formatWeekdayText } from "@/shared/lib/date";

interface Timing {
  period?: Frequency;
  dayOfMonth: number;
  startMonth: string;
}

// When a schedule books, in words: every Monday, day 5 of each month and so on
export const scheduleWhen = (t: I18n["t"], timing: Timing): string => {
  const first = dateInMonth(timing.startMonth, timing.dayOfMonth);
  switch (timing.period ?? "monthly") {
    case "weekly":
      return t("tx.freq.weekly", { weekday: formatWeekdayText(first) });
    case "quarterly":
      return t("tx.freq.quarterly", { day: timing.dayOfMonth });
    case "yearly":
      return t("tx.freq.yearly", { date: formatDateShort(first) });
    case "monthly":
      return t("tx.subs.monthlyDay", { day: timing.dayOfMonth });
  }
};
