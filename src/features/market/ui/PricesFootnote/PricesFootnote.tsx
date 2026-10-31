"use client";

import { useStore } from "@/app/hooks";
import { lastPricedAt, pricedPositions } from "@/features/market/model/refresh";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDateTime, nextHourLabel } from "@/shared/lib/date";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./PricesFootnote.module.scss";

interface PricesFootnoteProps {
  scope: "accounts" | "investments";
}

// When a page's coin and fund prices were fetched and when they refresh
const PricesFootnote = ({ scope }: PricesFootnoteProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const priced = pricedPositions(state);
  const count =
    scope === "accounts" ? priced.coinAccounts.length : priced.coinInvestments.length + priced.inzhurInvestments.length;
  if (count === 0) return null;
  const pricedAt = lastPricedAt(state);
  return (
    <p className={styles.footnote}>
      <Icon name="refresh" size={13} />
      <span>
        {pricedAt ? t("balance.prices.pricedAt", { when: formatDateTime(pricedAt) }) : t("balance.prices.never")}
      </span>
      <span aria-hidden>·</span>
      <span>{t("prices.nextUpdate", { time: nextHourLabel() })}</span>
    </p>
  );
};

export default PricesFootnote;
