"use client";

import { useSyncStatus } from "@/app/hooks";
import { openCommandPalette } from "@/features/commands/model/palette";
import AmountsToggle from "@/features/settings/ui/AmountsToggle/AmountsToggle";
import { useI18n } from "@/shared/i18n/useI18n";
import Icon from "@/shared/ui/Icon/Icon";
import Brand from "@/widgets/Brand/Brand";
import SyncDot from "@/widgets/SyncDot/SyncDot";

import styles from "./TopBar.module.scss";

// The phone's top bar: brand, save status, hiding amounts and search
const TopBar = () => {
  const { sync } = useSyncStatus();
  const { t } = useI18n();
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Brand />
        <SyncDot sync={sync} />
        <AmountsToggle className={styles.amounts} />
        <button type="button" onClick={openCommandPalette} aria-label={t("palette.title")} className={styles.search}>
          <Icon name="search" size={18} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
