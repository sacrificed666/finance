"use client";

import { useStore } from "@/app/hooks";
import { investmentAt } from "@/features/data/model/finmath";
import type { Investment } from "@/features/data/model/types";
import { investmentColorSlot } from "@/features/investments/model/kinds";
import { hasSchedule, investmentSchedule } from "@/features/investments/model/schedule";
import PositionMark from "@/features/investments/ui/PositionMark/PositionMark";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDate, monthDiff, monthOf, todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import Money from "@/shared/ui/Money/Money";
import Unit from "@/shared/ui/Unit/Unit";

import styles from "./ScheduleCard.module.scss";

// The maturing positions listed before the rest fold into a count
const SHOWN = 4;

interface ScheduleCardProps {
  onOpen: (inv: Investment) => void;
  onRenew: (inv: Investment) => void;
  onClose: (inv: Investment) => void;
}

// The money going in and coming out each month, and the terms that end
const ScheduleCard = ({ onOpen, onRenew, onClose }: ScheduleCardProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const base = state.settings.baseCurrency;
  const today = todayISO();
  const schedule = investmentSchedule(state, today);
  if (!hasSchedule(schedule)) return null;
  const { topUps, payoutsYear, maturing, matured } = schedule;
  const flows = topUps > 0 || payoutsYear > 0;
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, base, { compact: true });

  return (
    <Card title={t("investments.schedule")} subtitle={t("investments.schedule.subtitle")} icon="calendar">
      {matured.length > 0 && (
        <div className={cx((flows || maturing.length > 0) && styles.before)}>
          <p className={styles.title}>{t("investments.matured")}</p>
          <ul className={styles.matured}>
            {matured.map((inv) => (
              <li key={inv.id} className={styles.ended}>
                <div className={styles.line}>
                  <IconDisc colorSlot={investmentColorSlot(inv.kind)} size="md">
                    <PositionMark inv={inv} />
                  </IconDisc>
                  <span className={styles.text}>
                    <span className={styles.name}>{inv.name}</span>
                    <span className={styles.date}>
                      {t("investments.matured.on", { date: formatDate(inv.endDate) })}
                    </span>
                  </span>
                  <Money
                    amount={investmentAt(inv, inv.endDate).value}
                    currency={inv.currency}
                    compact
                    className={styles.amount}
                  />
                </div>
                <div className={styles.choices}>
                  <Button size="sm" onClick={() => onRenew(inv)}>
                    {t("investments.renew")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onClose(inv)}>
                    {t("investments.withdraw")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {flows && (
        <div className={cx(styles.flows, topUps > 0 && payoutsYear > 0 && styles.pair)}>
          {topUps > 0 && (
            <div className={styles.flow}>
              <p className={styles.caption}>{t("investments.topUps")}</p>
              <p className={styles.figure}>
                {money(topUps)}
                <Unit>{t("common.perMonth")}</Unit>
              </p>
              <p className={styles.yearly}>{t("tx.subs.perYear", { amount: money(topUps * 12) })}</p>
            </div>
          )}
          {payoutsYear > 0 && (
            <div className={styles.flow}>
              <p className={styles.caption}>{t("investments.payouts")}</p>
              <p className={cx(styles.figure, styles.income)}>
                ≈ {money(payoutsYear / 12)}
                <Unit>{t("common.perMonth")}</Unit>
              </p>
              <p className={styles.yearly}>{t("tx.subs.perYear", { amount: money(payoutsYear) })}</p>
            </div>
          )}
        </div>
      )}

      {maturing.length > 0 && (
        <div className={cx(flows && styles.after)}>
          <p className={styles.title}>{t("balance.inv.matures")}</p>
          <ul className={styles.rows}>
            {maturing.slice(0, SHOWN).map((inv) => {
              const months = Math.max(0, monthDiff(monthOf(today), monthOf(inv.endDate)));
              return (
                <li key={inv.id}>
                  <button type="button" onClick={() => onOpen(inv)} className={styles.row}>
                    <IconDisc colorSlot={investmentColorSlot(inv.kind)} size="md" className={styles.disc}>
                      <PositionMark inv={inv} />
                    </IconDisc>
                    <span className={styles.rowName}>{inv.name}</span>
                    <span className={styles.rowDate}>
                      {formatDate(inv.endDate)}
                      {months > 0 ? ` · ${tp("forecast.goal.inMonths", months)}` : ""}
                    </span>
                    <Money
                      amount={investmentAt(inv, inv.endDate).value}
                      currency={inv.currency}
                      compact
                      className={styles.rowAmount}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          {maturing.length > SHOWN && (
            <p className={styles.more}>{t("investments.matures.more", { n: maturing.length - SHOWN })}</p>
          )}
        </div>
      )}
    </Card>
  );
};

export default ScheduleCard;
