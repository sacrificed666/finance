"use client";

import { useStore } from "@/app/hooks";
import { taxLimits } from "@/features/income/model/income";
import { taxRegime, taxYearValues } from "@/features/income/model/tax";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { todayISO } from "@/shared/lib/date";
import { formatMoney, formatPercent } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import styles from "./TaxLimitCard.module.scss";

// A short amount in hryvnias
const money = (amount: number) => formatMoney(amount, "UAH", { compact: true });

// How much of each regime's yearly income limit is used; nothing without one
const TaxLimitCard = () => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const today = todayISO();
  const year = today.slice(0, 4);
  const limits = taxLimits(state, today);
  if (limits.length === 0) return null;
  const figures = taxYearValues(Number(year));

  return (
    <Card title={t("tax.limit.title", { year })} subtitle={tp("tax.limit.regimes", limits.length)} icon="shield">
      {!figures.known && <p className={styles.unknown}>{t("tax.yearUnknown", { year, used: figures.year })}</p>}
      <ul className={styles.limits}>
        {limits.map(({ regime, headroom }) => (
          <li key={regime}>
            <div className={styles.head}>
              <span className={styles.name}>{t(taxRegime(regime).shortKey)}</span>
              <span className={styles.used}>
                {money(headroom.used)} {t("tax.limit.of", { limit: money(headroom.limit) })}
              </span>
            </div>
            <div className={styles.meter}>
              <ProgressMeter
                value={headroom.used}
                max={headroom.limit}
                tone="budget"
                label={t(taxRegime(regime).shortKey)}
              />
            </div>
            <p className={cx(styles.left, headroom.pct >= 90 && styles.near)}>
              {t("tax.limit.left", { pct: formatPercent(headroom.pct), left: money(headroom.remaining) })}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default TaxLimitCard;
