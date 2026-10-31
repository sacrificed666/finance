"use client";

import type { SyncStatus } from "@/app/store";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";

import { syncTitle } from "./syncTitle";

import styles from "./SyncDot.module.scss";

// A pill in the phone's top bar while a change is saving or could not be saved
const SyncDot = ({ sync }: { sync: SyncStatus }) => {
  const { t } = useI18n();
  if (sync === "idle") return null;
  const failed = sync === "error";
  return (
    <span title={syncTitle(sync, t)} className={cx(styles.pill, failed ? styles.failed : styles.saving)}>
      <span aria-hidden className={styles.dot} />
      {failed ? t("sync.notSaved") : t("sync.saving")}
    </span>
  );
};

export default SyncDot;
