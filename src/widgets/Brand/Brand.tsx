"use client";

import Link from "next/link";

import { useStore, useSyncStatus } from "@/app/hooks";
import { netWorth } from "@/features/data/model/finmath";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import Logo from "@/shared/ui/Logo/Logo";
import { syncTitle } from "@/widgets/SyncDot/syncTitle";

import styles from "./Brand.module.scss";

// The logo, the name and today's net worth; a dot tells of a save under way
const Brand = ({ className }: { className?: string }) => {
  const { state, hydrated } = useStore();
  const { sync } = useSyncStatus();
  const { t } = useI18n();
  const worth = netWorth(state, todayISO());
  return (
    <Link href="/" className={cx(styles.brand, className)}>
      <span className={styles.mark}>
        <Logo className={styles.logo} />
        {sync !== "idle" && (
          <span
            title={syncTitle(sync, t)}
            className={cx(styles.dot, sync === "error" ? styles.failed : styles.saving)}
          />
        )}
      </span>
      <span className={styles.text}>
        <span className={styles.name}>{t("app.name")}</span>
        {hydrated && (
          <span className={styles.worth}>
            {formatMoney(worth.total, state.settings.baseCurrency, { compact: true })}
          </span>
        )}
        <span className={styles.hidden}>{`, ${t("nav.dashboard")}`}</span>
      </span>
    </Link>
  );
};

export default Brand;
