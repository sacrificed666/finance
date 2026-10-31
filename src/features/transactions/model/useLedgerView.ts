"use client";

import { useState } from "react";

import { LEDGER_KINDS, NO_FILTER, type LedgerFilter, type LedgerKind } from "@/features/transactions/model/ledger";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { oneOf } from "@/shared/lib/listing";

// The ledger's filter and kind, maybe starting at a category or the review queue
export const useLedgerView = (startCategory = "", startReview = false) => {
  const [filter, setFilter] = useState<LedgerFilter>({ ...NO_FILTER, categoryId: startCategory, review: startReview });
  const [kept, setKind] = usePersistentState<LedgerKind>("ledger.kind", "expense", oneOf(LEDGER_KINDS));
  const kind = filter.review ? "all" : kept;
  // Narrows to a category's spending, or lets go of it when it is already chosen
  const toggleCategory = (categoryId: string) => {
    setFilter({ ...filter, categoryId: filter.categoryId === categoryId ? "" : categoryId });
    if (kind === "income" || kind === "transfer") setKind("expense");
  };
  // Finds a place's expenses by its name, or lets go when it is already searched
  const searchFor = (text: string) => {
    const same = filter.query.trim().toLocaleLowerCase() === text.toLocaleLowerCase();
    setFilter({ ...filter, query: same ? "" : text, categoryId: same ? filter.categoryId : "" });
    if (kind === "income" || kind === "transfer") setKind("expense");
  };
  return { filter, setFilter, kind, setKind, toggleCategory, searchFor };
};

export type LedgerView = ReturnType<typeof useLedgerView>;
