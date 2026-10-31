"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import type { Transaction } from "@/features/data/model/types";
import { taxLimits } from "@/features/income/model/income";
import { hasTaxCalendar } from "@/features/income/model/taxCalendar";
import IncomeByMonthCard from "@/features/income/ui/IncomeByMonthCard/IncomeByMonthCard";
import IncomeHero from "@/features/income/ui/IncomeHero/IncomeHero";
import IncomeListCard from "@/features/income/ui/IncomeListCard/IncomeListCard";
import IncomeSheet from "@/features/income/ui/IncomeSheet/IncomeSheet";
import IncomeSourcesCard from "@/features/income/ui/IncomeSourcesCard/IncomeSourcesCard";
import QuarterlyTaxCard from "@/features/income/ui/QuarterlyTaxCard/QuarterlyTaxCard";
import TaxCalendarCard from "@/features/income/ui/TaxCalendarCard/TaxCalendarCard";
import TaxLimitCard from "@/features/income/ui/TaxLimitCard/TaxLimitCard";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import AddButton from "@/shared/ui/AddButton/AddButton";
import PageBody from "@/shared/ui/PageBody/PageBody";
import PageHeader from "@/shared/ui/PageHeader/PageHeader";
import Split from "@/shared/ui/Split/Split";

// The income page; without taxes the months sit beside the list, by the sources
const IncomePage = () => {
  const { state } = useStore();
  const { t } = useI18n();
  const [target, setTarget] = useState<Transaction | "new" | null>(null);
  const taxed = hasTaxCalendar(state.settings.tax.regime) || taxLimits(state, todayISO()).length > 0;
  // Opens an empty income
  const openAdd = () => setTarget("new");
  const list = <IncomeListCard onAdd={openAdd} onEdit={setTarget} />;

  return (
    <>
      <PageHeader
        title={t("income.title")}
        action={<AddButton variant="primary" onClick={openAdd} label={t("income.add")} />}
      />
      <PageBody>
        <IncomeHero />
        {taxed ? (
          <Split
            stickySide
            main={
              <>
                <IncomeByMonthCard />
                <QuarterlyTaxCard />
              </>
            }
            tail={list}
            side={
              <>
                <TaxLimitCard />
                <TaxCalendarCard />
                <IncomeSourcesCard />
              </>
            }
          />
        ) : (
          <Split
            sideFirst
            stickySide
            main={list}
            side={
              <>
                <IncomeByMonthCard />
                <IncomeSourcesCard />
              </>
            }
          />
        )}
      </PageBody>

      {target && (
        <IncomeSheet key={target === "new" ? "new" : target.id} target={target} onClose={() => setTarget(null)} />
      )}
    </>
  );
};

export default IncomePage;
