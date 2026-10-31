"use client";

import type { SubscriptionStatus } from "@/features/data/model/finmath";
import type { RecurringStatus } from "@/features/transactions/model/recurring";
import { useI18n } from "@/shared/i18n/useI18n";
import Badge, { type BadgeTone } from "@/shared/ui/Badge/Badge";

interface StatusBadgeProps {
  status: SubscriptionStatus | RecurringStatus;
}

// The tone of each status that gets a badge
const TONES: Record<"upcoming" | "ended" | "paused", BadgeTone> = {
  upcoming: "accent",
  ended: "neutral",
  paused: "warning",
};

// Marks a plan or subscription that is not running this month
const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { t } = useI18n();
  if (status === "active" || status === "now") return null;
  return <Badge tone={TONES[status]}>{t(`tx.status.${status}`)}</Badge>;
};

export default StatusBadge;
