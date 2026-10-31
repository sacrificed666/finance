"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { lazy, Suspense } from "react";

import { useStore } from "@/app/hooks";
import type { Transaction, TxType } from "@/features/data/model/types";
import { currentMonth } from "@/shared/lib/date";

// The sheets load the first time an address asks for one, not with every page
const IncomeSheet = lazy(() => import("@/features/income/ui/IncomeSheet/IncomeSheet"));
const TransactionSheet = lazy(() => import("@/features/transactions/ui/TransactionSheet/TransactionSheet"));

// The kinds of entry an address can ask to add
const ADD_TYPES: TxType[] = ["expense", "income", "transfer"];

// Whether an income has a breakdown or tax that only its own sheet edits
const needsIncomeSheet = (entry: Transaction): boolean =>
  entry.type === "income" && (entry.tax !== undefined || entry.breakdown !== undefined);

// Opens the entry sheet that the address asks for: ?add=expense or ?tx=<id>
const Intents = () => {
  const { state, hydrated } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  if (!hydrated) return null;

  const type = ADD_TYPES.find((kind) => kind === params.get("add"));
  const id = params.get("tx");
  const editing = id ? state.transactions.find((tx) => tx.id === id) : undefined;
  if (!type && !editing) return null;

  // Drops the request from the address and keeps the rest of it
  const close = () => {
    const rest = new URLSearchParams(params);
    rest.delete("add");
    rest.delete("tx");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  if (editing && needsIncomeSheet(editing)) return <IncomeSheet key={editing.id} target={editing} onClose={close} />;

  return (
    <TransactionSheet
      key={editing ? editing.id : `add:${String(type)}`}
      target={editing ?? "new"}
      type={type}
      month={currentMonth()}
      onClose={close}
    />
  );
};

// The entry sheets the home screen shortcuts and links open, on every page
const EntryIntents = () => (
  <Suspense fallback={null}>
    <Intents />
  </Suspense>
);

export default EntryIntents;
