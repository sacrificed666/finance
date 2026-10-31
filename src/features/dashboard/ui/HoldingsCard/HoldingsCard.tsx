"use client";

import Link from "next/link";

import { useStore } from "@/app/hooks";
import { holdingRows } from "@/features/dashboard/model/summary";
import { displayCurrencies } from "@/features/data/model/currencies";
import { currencyAllocation, netWorth } from "@/features/data/model/finmath";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import type { BreakdownSegment } from "@/shared/lib/chart";
import { todayISO } from "@/shared/lib/date";
import { oneOf } from "@/shared/lib/listing";
import { CURRENCY_SLOT, CURRENCY_SYMBOL, formatMoney, formatNumber, type Currency } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import CategoryBreakdown from "@/shared/ui/CategoryBreakdown/CategoryBreakdown";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";
import LinkButton from "@/shared/ui/LinkButton/LinkButton";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";

import styles from "./HoldingsCard.module.scss";

const VIEWS = ["holdings", "currencies"] as const;

// Whether a currency is priced in hryvnias
const isForeign = (currency: Currency): currency is Exclude<Currency, "UAH"> => currency !== "UAH";

// Net worth by holding or by currency, with tiles for the accounts and investments
const HoldingsCard = () => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const { settings } = state;
  const base = settings.baseCurrency;
  const today = todayISO();
  const [view, setView] = usePersistentState<(typeof VIEWS)[number]>("dash.allocation", "holdings", oneOf(VIEWS));
  const worth = netWorth(state, today);
  const rows = holdingRows(state, today);
  const allocation = currencyAllocation(state, today).filter((entry) => entry.base > 0);
  const holdings: BreakdownSegment[] = rows.map(({ holding, colorSlot }) => ({
    id: holding.id,
    label: holding.label,
    icon: holding.icon,
    value: holding.base,
    colorSlot,
  }));
  const currencies: BreakdownSegment[] = allocation.map((entry) => ({
    id: entry.currency,
    label: entry.currency,
    icon: CURRENCY_SYMBOL[entry.currency],
    value: entry.base,
    colorSlot: CURRENCY_SLOT[entry.currency],
  }));
  const mixed = currencies.length > 1;
  const byCurrency = mixed && view === "currencies";
  const tiles = [
    {
      href: "/accounts",
      label: t("balance.accounts"),
      value: worth.savings,
      hint: tp("dash.accountsCount", state.savings.length),
    },
    {
      href: "/investments",
      label: t("balance.investments"),
      value: worth.investments,
      hint: tp("balance.inv.positions", state.investments.length),
    },
  ];

  // A foreign row's amount in its own currency, under its label
  const native = (id: string) => {
    const holding = byCurrency
      ? allocation.find((entry) => entry.currency === id)
      : rows.find((row) => row.holding.id === id)?.holding;
    if (!holding || holding.currency === base) return null;
    return <p className={styles.native}>{formatMoney(holding.native, holding.currency)}</p>;
  };

  return (
    <Card
      title={t("dash.allocation")}
      icon="bank"
      action={
        mixed ? (
          <SegmentedControl
            size="sm"
            label={t("dash.allocation")}
            options={[
              { value: "holdings", label: t("dash.allocation.holdings") },
              { value: "currencies", label: t("dash.allocation.currencies") },
            ]}
            value={byCurrency ? "currencies" : "holdings"}
            onChange={setView}
          />
        ) : undefined
      }
    >
      {holdings.length > 0 ? (
        <>
          <CategoryBreakdown
            key={byCurrency ? "currencies" : "holdings"}
            segments={byCurrency ? currencies : holdings}
            currency={base}
            maxSegments={7}
            rowExtra={native}
          />
          {byCurrency && (
            <p className={styles.rates}>
              <Icon name="exchange" size={13} className={styles.ratesIcon} />
              {displayCurrencies(state)
                .filter(isForeign)
                .map((currency) => `1 ${CURRENCY_SYMBOL[currency]} = ${formatNumber(settings.rates[currency], 2)} ₴`)
                .join(" · ")}
            </p>
          )}
          <div className={styles.tiles}>
            {tiles.map((tile) => (
              <Link key={tile.href} href={tile.href} className={styles.tile}>
                <span className={styles.label}>
                  {tile.label}
                  <Icon name="arrowRight" size={12} strokeWidth={2.4} className={styles.arrow} />
                </span>
                <span className={styles.value}>{formatMoney(tile.value, base, { compact: true })}</span>
                <span className={styles.hint}>{tile.hint}</span>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Icon name="bank" />}
          title={t("dash.holdings.empty")}
          hint={t("dash.holdings.empty.hint")}
          action={
            <LinkButton href="/accounts" variant="ghost">
              {t("dash.holdings.add")}
            </LinkButton>
          }
        />
      )}
    </Card>
  );
};

export default HoldingsCard;
