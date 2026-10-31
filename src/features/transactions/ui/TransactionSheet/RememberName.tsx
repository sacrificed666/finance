"use client";

import type { LearnedName } from "@/features/import/model/import";
import { useI18n } from "@/shared/i18n/useI18n";
import Switch from "@/shared/ui/Switch/Switch";

import styles from "./TransactionSheet.module.scss";

interface RememberNameProps {
  learned: LearnedName;
  name: string;
  remember: boolean;
  onRemember: (remember: boolean) => void;
  renameOthers: boolean;
  onRenameOthers: (renameOthers: boolean) => void;
}

// Offers to call the merchant by the new name from now on, its older entries too
const RememberName = ({ learned, name, remember, onRemember, renameOthers, onRenameOthers }: RememberNameProps) => {
  const { t, tp } = useI18n();
  const rule = t("tx.learn.name", { match: learned.match, name: name.trim() });
  const others = tp("tx.learn.renameOthers", learned.others.length);
  return (
    <div className={styles.learn}>
      <div className={styles.learnRow}>
        <div className={styles.learnText}>
          <p className={styles.learnTitle}>{rule}</p>
          <p className={styles.learnHint}>{t("tx.learn.nameHint")}</p>
        </div>
        <Switch checked={remember} onChange={onRemember} label={rule} />
      </div>
      {remember && learned.others.length > 0 && (
        <div className={styles.learnOthers}>
          <p className={styles.othersText}>{others}</p>
          <Switch checked={renameOthers} onChange={onRenameOthers} label={others} />
        </div>
      )}
    </div>
  );
};

export default RememberName;
