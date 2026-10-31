"use client";

import { lazy, Suspense, useDeferredValue, useState } from "react";

import type { Transaction } from "@/features/data/model/types";
import { useLedgerView } from "@/features/transactions/model/useLedgerView";
import BudgetsCard from "@/features/transactions/ui/BudgetsCard/BudgetsCard";
import LedgerCard, { LEDGER_ID } from "@/features/transactions/ui/LedgerCard/LedgerCard";
import MonthHero from "@/features/transactions/ui/MonthHero/MonthHero";
import PlacesCard from "@/features/transactions/ui/PlacesCard/PlacesCard";
import RecurringCard from "@/features/transactions/ui/RecurringCard/RecurringCard";
import SpendingOverview from "@/features/transactions/ui/SpendingOverview/SpendingOverview";
import SubscriptionsCard from "@/features/transactions/ui/SubscriptionsCard/SubscriptionsCard";
import { useI18n } from "@/shared/i18n/useI18n";
import { currentMonth } from "@/shared/lib/date";
import AddButton from "@/shared/ui/AddButton/AddButton";
import PageBody from "@/shared/ui/PageBody/PageBody";
import PageHeader from "@/shared/ui/PageHeader/PageHeader";
import Split from "@/shared/ui/Split/Split";

// The entry sheet loads the first time an entry is opened or added
const TransactionSheet = lazy(() => import("@/features/transactions/ui/TransactionSheet/TransactionSheet"));

interface TransactionsPageProps {
  category?: string;
  review?: boolean;
}

// Brings the ledger into sight when a tile or a place narrowed it out of view
const showLedger = () => {
  const ledger = document.getElementById(LEDGER_ID);
  if (!ledger) return;
  const { top } = ledger.getBoundingClientRect();
  if (top >= 0 && top < window.innerHeight * 0.6) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  ledger.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
};

// The expenses page: the month's figures, the spending, the ledger and plans
const TransactionsPage = ({ category, review = false }: TransactionsPageProps) => {
  const { t } = useI18n();
  const [chosen, setMonth] = useState(currentMonth());
  const month = useDeferredValue(chosen);
  const [target, setTarget] = useState<Transaction | "new" | null>(null);
  const view = useLedgerView(category, review);
  // Opens an empty entry
  const openAdd = () => setTarget("new");

  return (
    <>
      <PageHeader
        title={t("tx.title")}
        action={<AddButton variant="primary" onClick={openAdd} label={t("common.add")} />}
      />
      <PageBody>
        <MonthHero month={month} switcherMonth={chosen} onMonthChange={setMonth} />
        <Split
          main={
            <>
              <SpendingOverview
                month={month}
                chosen={view.filter.categoryId}
                onChoose={(categoryId) => {
                  view.toggleCategory(categoryId);
                  showLedger();
                }}
              />
              <LedgerCard month={month} view={view} onAdd={openAdd} onEdit={setTarget} />
            </>
          }
          side={
            <>
              <BudgetsCard month={month} />
              <PlacesCard
                month={month}
                chosen={view.filter.query}
                onChoose={(name) => {
                  view.searchFor(name);
                  showLedger();
                }}
              />
              <SubscriptionsCard month={month} />
              <RecurringCard month={month} />
            </>
          }
        />
      </PageBody>

      {target && (
        <Suspense fallback={null}>
          <TransactionSheet
            key={target === "new" ? `new:${month}` : target.id}
            target={target}
            month={month}
            onClose={() => setTarget(null)}
          />
        </Suspense>
      )}
    </>
  );
};

export default TransactionsPage;
