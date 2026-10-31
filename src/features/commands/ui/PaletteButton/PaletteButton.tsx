"use client";

import { useSyncExternalStore } from "react";

import { openCommandPalette } from "@/features/commands/model/palette";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./PaletteButton.module.scss";

// Nothing to subscribe to: the platform never changes
const noSubscription = () => () => {};

// Whether the device is a Mac, iPhone or iPad, where the shortcut uses Cmd
const isApple = () => /Mac|iPhone|iPad/u.test(navigator.platform);

// A search field look-alike that opens the palette and shows its shortcut
const PaletteButton = ({ className }: { className?: string }) => {
  const { t } = useI18n();
  const apple = useSyncExternalStore(noSubscription, isApple, () => false);
  return (
    <button type="button" onClick={openCommandPalette} className={cx(styles.button, className)}>
      <Icon name="search" size={16} />
      <span className={styles.label}>{t("palette.button")}</span>
      <kbd className={styles.shortcut}>{apple ? "⌘K" : "Ctrl K"}</kbd>
    </button>
  );
};

export default PaletteButton;
