"use client";

import type { LearnedRule } from "@/features/import/model/import";
import { useI18n } from "@/shared/i18n/useI18n";
import Switch from "@/shared/ui/Switch/Switch";

import styles from "./TransactionSheet.module.scss";

interface RememberRuleProps {
  learned: LearnedRule;
  categoryName: string;
  remember: boolean;
  onRemember: (remember: boolean) => void;
  moveOthers: boolean;
  onMoveOthers: (moveOthers: boolean) => void;
}

// Offers to keep the merchant in the new category, its older entries too
const RememberRule = ({ learned, categoryName, remember, onRemember, moveOthers, onMoveOthers }: RememberRuleProps) => {
  const { t, tp } = useI18n();
  const rule = t("tx.learn.rule", { name: learned.match, category: categoryName });
  const others = tp("tx.learn.others", learned.others.length);
  return (
    <div className={styles.learn}>
      <div className={styles.learnRow}>
        <div className={styles.learnText}>
          <p className={styles.learnTitle}>{rule}</p>
          <p className={styles.learnHint}>{t("tx.learn.hint")}</p>
        </div>
        <Switch checked={remember} onChange={onRemember} label={rule} />
      </div>
      {remember && learned.others.length > 0 && (
        <div className={styles.learnOthers}>
          <p className={styles.othersText}>{others}</p>
          <Switch checked={moveOthers} onChange={onMoveOthers} label={others} />
        </div>
      )}
    </div>
  );
};

export default RememberRule;
