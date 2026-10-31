"use client";

import { monthlyPrice, nextCharge, subscriptionsDue } from "@/features/dashboard/model/subscriptionsDue";
import { useMonthSummary } from "@/features/dashboard/model/useMonthSummary";
import { SUBSCRIPTION_SLOT } from "@/features/transactions/model/schedules";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDateShort } from "@/shared/lib/date";
import { formatMoney, formatPercent } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import CardLink from "@/shared/ui/CardLink/CardLink";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import LinkButton from "@/shared/ui/LinkButton/LinkButton";
import Money from "@/shared/ui/Money/Money";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";
import Unit from "@/shared/ui/Unit/Unit";

import styles from "./SubscriptionsCard.module.scss";

// The subscriptions listed before the rest fold into a count
const SHOWN = 5;

// This month's subscriptions: their total, their share of spending and the dearest
const SubscriptionsCard = () => {
  const { state, base, month, today, series } = useMonthSummary();
  const { t } = useI18n();
  const { billed, charging, total, top, share } = subscriptionsDue(state, month, series, SHOWN);
  const slot = state.categories.find((entry) => entry.id === "cat-subs")?.colorSlot ?? SUBSCRIPTION_SLOT;
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, base, { compact: true });

  return (
    <Card title={t("tx.subs")} icon="device" action={<CardLink href="/transactions" />}>
      {billed.length > 0 ? (
        <>
          <SummaryPanel
            className={styles.summary}
            value={
              <>
                {money(total)}
                <Unit>{t("common.perMonth")}</Unit>
              </>
            }
            meta={share > 0 ? t("dash.subs.share", { pct: formatPercent(share, 0) }) : undefined}
          >
            <p className={styles.count}>{t("dash.subs.summary", { n: charging, year: money(total * 12) })}</p>
          </SummaryPanel>
          <ul className={styles.rows}>
            {top.map((sub) => {
              const next = nextCharge(sub, today);
              const when = next ? t("taxcal.next", { when: formatDateShort(next) }) : t("dash.subs.lastCharge");
              return (
                <li key={sub.id} className={styles.row}>
                  <IconDisc colorSlot={slot} size="md">
                    {sub.icon}
                  </IconDisc>
                  <span className={styles.titles}>
                    <span className={styles.name}>{sub.name}</span>
                    <span className={styles.meta}>
                      {sub.period === "yearly" ? `${when} · ${t("dash.subs.yearly")}` : when}
                    </span>
                  </span>
                  <span className={styles.price}>
                    <Money amount={monthlyPrice(sub)} currency={sub.currency} className={styles.amount} />
                    <Unit>{t("common.perMonth")}</Unit>
                  </span>
                </li>
              );
            })}
          </ul>
          {billed.length > top.length && (
            <p className={styles.more}>{t("dash.subs.more", { n: billed.length - top.length })}</p>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Icon name="device" />}
          title={t("dash.subs.empty")}
          hint={t("dash.subs.empty.hint")}
          action={
            <LinkButton href="/transactions" variant="ghost">
              {t("dash.subs.add")}
            </LinkButton>
          }
        />
      )}
    </Card>
  );
};

export default SubscriptionsCard;
