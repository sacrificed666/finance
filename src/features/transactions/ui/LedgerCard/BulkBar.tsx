"use client";

import { useState, type FormEvent } from "react";

import { useStore } from "@/app/hooks";
import { normalizeTags } from "@/features/data/model/normalize";
import { useCategoryGroups } from "@/features/transactions/model/useCategoryGroups";
import { useI18n } from "@/shared/i18n/useI18n";
import Button from "@/shared/ui/Button/Button";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./LedgerCard.module.scss";

interface BulkBarProps {
  picked: number;
  shown: number;
  allTicked: boolean;
  onToggleAll: () => void;
  onCategory: (categoryId: string) => void;
  onTag: (tag: string) => void;
  onDelete: () => void;
}

// The picking bar: the count and a category, a tag or deletion for them all
const BulkBar = ({ picked, shown, allTicked, onToggleAll, onCategory, onTag, onDelete }: BulkBarProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const [draft, setDraft] = useState("");
  const categoryGroups = useCategoryGroups(state.categories, ["expense", "income"]);
  // Tags the picked entries with the typed tag, cleaned like every tag
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const tag = normalizeTags([draft])?.[0];
    if (!tag) return;
    onTag(tag);
    setDraft("");
  };

  return (
    <div className={styles.bulk}>
      <div className={styles.bulkHead}>
        <p className={styles.bulkCount}>{tp("tx.bulk.count", picked)}</p>
        <Button variant="ghost" size="sm" onClick={onToggleAll}>
          {allTicked ? t("tx.bulk.none") : tp("tx.bulk.all", shown)}
        </Button>
      </div>
      {picked > 0 && (
        <div className={styles.bulkActions}>
          <OptionPicker
            size="sm"
            label={t("tx.bulk.category")}
            placeholder={t("tx.bulk.category")}
            value=""
            onChange={onCategory}
            groups={categoryGroups}
          />
          <form className={styles.tagForm} onSubmit={submit}>
            <div className={styles.tagField}>
              <TextInput
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("tx.bulk.tagPlaceholder")}
                aria-label={t("tx.bulk.tag")}
                size="sm"
              />
            </div>
            <Button type="submit" variant="ghost" size="sm" className={styles.tagButton} disabled={!draft.trim()}>
              {t("tx.bulk.tag")}
            </Button>
          </form>
          <Button variant="danger" size="sm" className={styles.bulkDelete} onClick={onDelete}>
            {t("tx.bulk.delete")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BulkBar;
