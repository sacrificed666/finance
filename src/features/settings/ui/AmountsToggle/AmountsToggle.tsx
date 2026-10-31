"use client";

import { setHiddenAmounts, useHiddenAmounts } from "@/features/settings/model/hiddenAmounts";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./AmountsToggle.module.scss";

// A round button that hides every amount as dots on this device, or shows them
const AmountsToggle = ({ className, size = 18 }: { className?: string; size?: number }) => {
  const { t } = useI18n();
  const hidden = useHiddenAmounts();
  const label = hidden ? t("amounts.show") : t("amounts.hide");
  return (
    <button
      type="button"
      aria-pressed={hidden}
      aria-label={label}
      title={`${label} · H`}
      onClick={() => setHiddenAmounts(!hidden)}
      className={cx(styles.button, hidden && styles.on, className)}
    >
      <Icon name={hidden ? "eyeOff" : "eye"} size={size} strokeWidth={2} />
    </button>
  );
};

export default AmountsToggle;
