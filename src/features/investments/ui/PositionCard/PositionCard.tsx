"use client";

import type { ReactNode } from "react";

import { coinInfo } from "@/features/accounts/model/coins";
import type { Investment } from "@/features/data/model/types";
import { inzhurFund } from "@/features/investments/model/inzhur";
import { investmentColorSlot, valuationOf } from "@/features/investments/model/kinds";
import { positionReturns } from "@/features/investments/model/positions";
import { returnPolicy } from "@/features/investments/model/returns";
import { useReturnLabels } from "@/features/investments/model/useReturnLabels";
import PositionMark from "@/features/investments/ui/PositionMark/PositionMark";
import { useI18n } from "@/shared/i18n/useI18n";
import { seriesColor } from "@/shared/lib/chart";
import { cx } from "@/shared/lib/cx";
import { formatDate } from "@/shared/lib/date";
import { formatMoney, formatNumber, formatPercent } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import Fact from "@/shared/ui/Fact/Fact";
import Facts from "@/shared/ui/Facts/Facts";
import Icon from "@/shared/ui/Icon/Icon";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import Money from "@/shared/ui/Money/Money";

import styles from "./PositionCard.module.scss";

interface PositionCardProps {
  inv: Investment;
  today: string;
  yearOut: string;
  onEdit: () => void;
  className?: string;
}

interface PositionFact {
  label: string;
  value: ReactNode;
}

// One position as a card: its value and gain, its terms and the year ahead
const PositionCard = ({ inv, today, yearOut, onEdit, className }: PositionCardProps) => {
  const { t } = useI18n();
  const { returnLabel, yieldLabel } = useReturnLabels();
  const { snap, earned, gainPct, valueInYear, nextYear } = positionReturns(inv, today, yearOut);
  const market = valuationOf(inv.kind) === "market";
  const coin = coinInfo(inv.coin);
  const fund = inzhurFund(inv.fund);
  const matured = inv.endDate !== undefined && inv.endDate <= today;
  const topUp = inv.monthlyContribution ?? 0;
  const rated = !market || inv.annualRatePct > 0;
  const expected = fund
    ? yieldLabel(
        inv.annualRatePct,
        inv.annualRatePct === fund.projectedYieldPct ? fund.projectedYieldMaxPct : undefined,
        fund.linkedCurrency,
      )
    : t("balance.perYear", { pct: formatPercent(inv.annualRatePct) });
  const unitPrice = (coin ?? fund) && inv.quantity && inv.marketValue ? inv.marketValue / inv.quantity : null;

  const pairs: (PositionFact | false)[] = [
    rated && { label: market ? t("balance.inv.row.expected") : t("balance.inv.row.rate"), value: expected },
    !matured &&
      rated && {
        label: t("balance.inv.row.return"),
        value: returnLabel(returnPolicy(inv), inv.kind, inv.compoundingFreq),
      },
    !!coin &&
      !!inv.quantity && {
        label: t("balance.inv.row.holding"),
        value: `${formatNumber(inv.quantity, 8)} ${coin.symbol}`,
      },
    !!fund && !!inv.quantity && { label: t("balance.inv.row.certificates"), value: formatNumber(inv.quantity, 4) },
    unitPrice !== null && {
      label: fund ? t("balance.inv.row.nav") : t("balance.inv.row.price"),
      value: <Money amount={unitPrice} currency={inv.currency} exact />,
    },
    {
      label: market ? t("balance.inv.row.paid") : t("balance.inv.row.invested"),
      value: <Money amount={snap.invested} currency={inv.currency} exact />,
    },
    topUp > 0 && {
      label: t("balance.inv.row.topUp"),
      value: `${formatMoney(topUp, inv.currency)}${t("common.perMonth")}`,
    },
    topUp > 0 && {
      label: t("balance.inv.row.youAdd"),
      value: t("balance.inv.row.perYear", { amount: formatMoney(topUp * 12, inv.currency, { compact: true }) }),
    },
    { label: t("balance.inv.row.since"), value: formatDate(inv.startDate) },
    !!inv.endDate && {
      label: matured ? t("balance.inv.row.matured") : t("balance.inv.row.matures"),
      value: formatDate(inv.endDate),
    },
    !matured &&
      (rated || topUp > 0) && {
        label: t("balance.inv.row.inYear"),
        value: (
          <span>
            <Money amount={valueInYear} currency={inv.currency} exact />{" "}
            {nextYear > 0.5 && (
              <span className={styles.gain}>
                {t("balance.inv.row.inYearEarned", { amount: formatMoney(nextYear, inv.currency) })}
              </span>
            )}
          </span>
        ),
      },
  ];
  const shown = pairs.filter((fact) => fact !== false);
  // The last fact spans both columns when it would stand alone
  const lone = shown.length % 2 === 1 ? shown.at(-1) : undefined;

  return (
    <article className={cx(styles.card, className)} style={{ "--tint": seriesColor(investmentColorSlot(inv.kind)) }}>
      <div className={styles.head}>
        <IconDisc colorSlot={investmentColorSlot(inv.kind)} className={styles.mark}>
          <PositionMark inv={inv} size={30} coinSize={28} />
        </IconDisc>
        <div className={styles.title}>
          <h3 className={styles.name}>{inv.name}</h3>
          <p className={styles.meta}>
            {[t(`investmentKind.${inv.kind}`), fund && fund.name !== inv.name ? fund.name : null, inv.currency]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Button variant="ghost" size="sm" className={styles.edit} onClick={onEdit}>
          <Icon name="edit" size={14} />
          {t("common.edit")}
        </Button>
      </div>

      {inv.note && <p className={styles.note}>{inv.note}</p>}

      <div className={styles.value}>
        <div className={styles.figures}>
          <Money amount={snap.value} currency={inv.currency} exact className={styles.worth} />
          <p className={styles.earned}>
            {t("balance.inv.earnedLine", { amount: formatMoney(earned, inv.currency, { sign: true, compact: true }) })}
          </p>
        </div>
        <span className={cx(styles.badge, earned >= 0 ? styles.up : styles.down)}>
          <Icon name="trend" size={13} className={cx(earned < 0 && styles.flipped)} />
          {formatPercent(Math.abs(gainPct))}
        </span>
      </div>

      <Facts className={styles.facts}>
        {shown.map((fact) => (
          <Fact key={fact.label} label={fact.label} wide={fact === lone}>
            {fact.value}
          </Fact>
        ))}
      </Facts>
    </article>
  );
};

export default PositionCard;
