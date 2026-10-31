"use client";

import { lazy, Suspense, useState } from "react";

import { useStore } from "@/app/hooks";
import { recentEntries } from "@/features/dashboard/model/recent";
import type { Transaction } from "@/features/data/model/types";
import LedgerRow from "@/features/transactions/ui/LedgerCard/LedgerRow";
import { useI18n } from "@/shared/i18n/useI18n";
import { monthOf, todayISO } from "@/shared/lib/date";
import Card from "@/shared/ui/Card/Card";
import CardLink from "@/shared/ui/CardLink/CardLink";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./RecentCard.module.scss";

// The entry sheet loads the first time an entry is opened
const TransactionSheet = lazy(() => import("@/features/transactions/ui/TransactionSheet/TransactionSheet"));

// How many entries the card lists
const SHOWN = 5;

// The last entries logged up to today, each one opening to be fixed
const RecentCard = () => {
  const { state } = useStore();
  const { t } = useI18n();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const entries = recentEntries(state.transactions, todayISO(), SHOWN);

  return (
    <>
      <Card title={t("dash.recent")} icon="receipt" action={<CardLink href="/transactions" />}>
        {entries.length > 0 ? (
          <div className={styles.rows}>
            {entries.map((tx) => (
              <LedgerRow key={tx.id} tx={tx} showDate compact selecting={false} ticked={false} onPress={setEditing} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Icon name="receipt" />}
            title={t("dash.recent.empty")}
            hint={t("dash.recent.empty.hint")}
          />
        )}
      </Card>
      {editing && (
        <Suspense fallback={null}>
          <TransactionSheet
            key={editing.id}
            target={editing}
            month={monthOf(editing.date)}
            onClose={() => setEditing(null)}
          />
        </Suspense>
      )}
    </>
  );
};

export default RecentCard;
