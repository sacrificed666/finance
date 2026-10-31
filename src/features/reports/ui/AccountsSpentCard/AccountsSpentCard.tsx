"use client";

import { useStore } from "@/app/hooks";
import { accountColorSlot } from "@/features/accounts/model/kinds";
import { useI18n } from "@/shared/i18n/useI18n";
import type { BreakdownSegment } from "@/shared/lib/chart";
import type { Currency } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import CardLink from "@/shared/ui/CardLink/CardLink";
import CategoryBreakdown from "@/shared/ui/CategoryBreakdown/CategoryBreakdown";

interface AccountsSpentCardProps {
  byAccount: ReadonlyMap<string, number>;
  period: string;
  currency: Currency;
}

// The colour slot of spending booked to no account
const UNASSIGNED_SLOT = 0;

// What each account paid for in the period, once more than one did
const AccountsSpentCard = ({ byAccount, period, currency }: AccountsSpentCardProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const segments: BreakdownSegment[] = [...byAccount]
    .filter(([, value]) => value > 0)
    .toSorted((a, b) => b[1] - a[1])
    .map(([id, value]) => {
      const account = state.savings.find((item) => item.id === id);
      return {
        id: id || "none",
        label: account?.name ?? t("common.notAssigned"),
        icon: account?.icon ?? "💸",
        value,
        colorSlot: account ? accountColorSlot(account.kind) : UNASSIGNED_SLOT,
      };
    });
  if (segments.length < 2) return null;
  return (
    <Card title={t("reports.byAccount")} subtitle={period} icon="card" action={<CardLink href="/accounts" />}>
      <CategoryBreakdown segments={segments} currency={currency} />
    </Card>
  );
};

export default AccountsSpentCard;
