"use client";

import { useStore } from "@/app/hooks";
import { COMING_SHOWN, comingUp, type ComingItem } from "@/features/dashboard/model/comingUp";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { usePeriodLabel } from "@/features/income/model/usePeriodLabel";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDateShort, monthNamesShort, todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import CardLink from "@/shared/ui/CardLink/CardLink";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";

import styles from "./ComingUpCard.module.scss";

// Two weeks ahead as dated rows: taxes, money due back, planned and expected
const ComingUpCard = () => {
  const { state } = useStore();
  const { t } = useI18n();
  const category = useCategoryName();
  const periodLabel = usePeriodLabel();
  const today = todayISO();
  const items = comingUp(state, today).slice(0, COMING_SHOWN);
  const categories = new Map(state.categories.map((entry) => [entry.id, entry]));

  // What a row is called
  const title = (item: ComingItem) => {
    if (item.obligation) return t(`taxcal.${item.obligation.kind}`, { period: periodLabel(item.obligation.period) });
    if (item.receivable) return item.receivable.name;
    if (item.investment) return item.investment.name;
    if (item.grace) return item.grace.account.name;
    if (item.expected?.name) return item.expected.name;
    const subscription = state.subscriptions.find((sub) => sub.id === item.tx?.subscriptionId);
    if (subscription) return subscription.name;
    const note = item.tx?.note?.trim();
    if (note) return note;
    return category(categories.get(item.tx?.categoryId ?? item.expected?.categoryId ?? ""));
  };
  // What a row is, or how late it is
  const meta = (item: ComingItem) => {
    if (item.overdue) return t("dash.coming.overdue", { date: formatDateShort(item.date) });
    if (item.obligation) return t("dash.coming.tax");
    if (item.receivable) return t("receivables.title");
    if (item.investment) return t("balance.inv.matures");
    if (item.grace) return t("dash.coming.grace");
    if (item.expected) return t("dash.coming.expected");
    if (item.tx?.subscriptionId) return t("dash.coming.subscription");
    if (item.tx?.recurringId) return t("dash.coming.recurring");
    return t("dash.coming.planned");
  };
  // The amount with the sign of the way it moves
  const amount = (item: ComingItem) => {
    if (item.amount === undefined) return null;
    const incoming = item.kind === "income" || item.kind === "receivable";
    return `${incoming ? "+" : "−"}${formatMoney(item.amount, item.currency ?? state.settings.baseCurrency)}`;
  };

  return (
    <Card
      title={t("dash.coming")}
      subtitle={t("dash.coming.subtitle")}
      icon="calendar"
      action={<CardLink href="/calendar" />}
    >
      {items.length > 0 ? (
        <ul className={styles.rows}>
          {items.map((item) => {
            const figure = amount(item);
            const incoming = item.kind === "income" || item.kind === "receivable";
            return (
              <li key={item.id} className={styles.row}>
                <span className={cx(styles.date, item.overdue && styles.late)}>
                  <span className={styles.day}>{Number(item.date.slice(8))}</span>
                  <span className={styles.month}>{monthNamesShort()[Number(item.date.slice(5, 7)) - 1]}</span>
                </span>
                <IconDisc colorSlot={item.slot} size="sm">
                  {item.icon}
                </IconDisc>
                <span className={styles.text}>
                  <span className={styles.title}>{title(item)}</span>
                  <span className={cx(styles.meta, item.overdue && styles.lateText)}>{meta(item)}</span>
                </span>
                {figure && <span className={cx(styles.amount, incoming && styles.in)}>{figure}</span>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>{t("dash.coming.empty")}</p>
      )}
    </Card>
  );
};

export default ComingUpCard;
