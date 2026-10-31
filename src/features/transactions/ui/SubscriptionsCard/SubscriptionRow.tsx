"use client";

import { monthlyPrice } from "@/features/dashboard/model/subscriptionsDue";
import type { SubscriptionStatus } from "@/features/data/model/finmath";
import type { Subscription } from "@/features/data/model/types";
import { scheduleWhen } from "@/features/transactions/model/scheduleText";
import StatusBadge from "@/features/transactions/ui/StatusBadge/StatusBadge";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMonthText } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import Money from "@/shared/ui/Money/Money";
import Unit from "@/shared/ui/Unit/Unit";

import styles from "./SubscriptionsCard.module.scss";

interface SubscriptionRowProps {
  subscription: Subscription;
  status: SubscriptionStatus;
  colorSlot: number;
  onOpen: (subscription: Subscription) => void;
}

// One subscription: its status, when it charges and its monthly cost
const SubscriptionRow = ({ subscription, status, colorSlot, onOpen }: SubscriptionRowProps) => {
  const { t } = useI18n();
  const monthly = subscription.period === "monthly";
  // When it charges, then when it starts or ends if that matters this month
  const schedule = [
    monthly
      ? scheduleWhen(t, subscription)
      : `${formatMoney(subscription.price, subscription.currency)} · ${scheduleWhen(t, subscription)}`,
    status === "upcoming" ? t("tx.subs.from", { month: formatMonthText(subscription.startMonth) }) : null,
    subscription.endMonth && status === "ended"
      ? t("tx.subs.endedIn", { month: formatMonthText(subscription.endMonth) })
      : null,
    subscription.endMonth && status !== "ended"
      ? t("tx.subs.until", { month: formatMonthText(subscription.endMonth) })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(subscription)}
        className={cx(styles.row, status !== "active" && styles.idle)}
      >
        <IconDisc colorSlot={colorSlot} size="lg">
          {subscription.icon}
        </IconDisc>
        <span className={styles.body}>
          <span className={styles.title}>
            <span className={styles.name}>{subscription.name}</span>
            <StatusBadge status={status} />
          </span>
          <span className={styles.meta}>{schedule}</span>
        </span>
        <span className={styles.cost}>
          <Money amount={monthlyPrice(subscription)} currency={subscription.currency} className={styles.price} />
          <Unit>{t("common.perMonth")}</Unit>
        </span>
      </button>
    </li>
  );
};

export default SubscriptionRow;
