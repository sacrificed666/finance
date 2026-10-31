"use client";

import { useDeferredValue, useState } from "react";

import { useStore } from "@/app/hooks";
import { monthWeeks } from "@/features/calendar/model/monthEvents";
import { useMonthEvents } from "@/features/calendar/model/useMonthEvents";
import CalendarHero from "@/features/calendar/ui/CalendarHero/CalendarHero";
import DayCard from "@/features/calendar/ui/DayCard/DayCard";
import KeyDatesCard from "@/features/calendar/ui/KeyDatesCard/KeyDatesCard";
import MonthGrid from "@/features/calendar/ui/MonthGrid/MonthGrid";
import WeekdaysCard from "@/features/calendar/ui/WeekdaysCard/WeekdaysCard";
import WeeksCard from "@/features/calendar/ui/WeeksCard/WeeksCard";
import type { Transaction } from "@/features/data/model/types";
import TransactionSheet from "@/features/transactions/ui/TransactionSheet/TransactionSheet";
import { useI18n } from "@/shared/i18n/useI18n";
import { dateInMonth, monthOf, todayISO } from "@/shared/lib/date";
import AddButton from "@/shared/ui/AddButton/AddButton";
import PageBody from "@/shared/ui/PageBody/PageBody";
import PageHeader from "@/shared/ui/PageHeader/PageHeader";
import Split from "@/shared/ui/Split/Split";

// The day a month opens on: the one picked, today, or its first
const openingDay = (month: string, picked: string | null, today: string) => {
  if (picked && monthOf(picked) === month) return picked;
  return monthOf(today) === month ? today : dateInMonth(month, 1);
};

// The calendar page: the month's days, the picked day, key dates and its weeks
const CalendarPage = () => {
  const { state } = useStore();
  const { t } = useI18n();
  const today = todayISO();
  const [chosen, setChosen] = useState(monthOf(today));
  const month = useDeferredValue(chosen);
  const [picked, setPicked] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Transaction | "new" | null>(null);
  const { days, keyDates, obligations } = useMonthEvents(month);
  const selected = openingDay(month, picked, today);
  const day = days.find((entry) => entry.date === selected) ?? { date: selected, events: [], net: 0, spent: 0 };
  const base = state.settings.baseCurrency;

  return (
    <>
      <PageHeader
        title={t("nav.calendar")}
        action={<AddButton variant="primary" onClick={() => setSheet("new")} label={t("common.add")} />}
      />
      <PageBody>
        <CalendarHero month={month} chosen={chosen} days={days} obligations={obligations} onMonth={setChosen} />
        <Split
          main={
            <>
              <MonthGrid
                month={month}
                days={days}
                today={today}
                selected={selected}
                currency={base}
                onPick={setPicked}
              />
              <WeekdaysCard today={today} />
            </>
          }
          side={
            <>
              <DayCard day={day} today={today} currency={base} onAdd={() => setSheet("new")} onOpen={setSheet} />
              <KeyDatesCard month={month} dates={keyDates} onPick={setPicked} />
              <WeeksCard weeks={monthWeeks(days)} today={today} currency={base} onPick={setPicked} />
            </>
          }
        />
      </PageBody>

      {sheet && (
        <TransactionSheet
          key={sheet === "new" ? `new:${selected}` : sheet.id}
          target={sheet}
          month={month}
          date={sheet === "new" ? selected : undefined}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
};

export default CalendarPage;
