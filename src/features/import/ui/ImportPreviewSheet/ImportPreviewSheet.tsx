"use client";

import { useStore } from "@/app/hooks";
import type { ImportCandidate } from "@/features/import/model/import";
import { useCategoryGroups } from "@/features/transactions/model/useCategoryGroups";
import { useI18n } from "@/shared/i18n/useI18n";
import Button from "@/shared/ui/Button/Button";
import Sheet from "@/shared/ui/Sheet/Sheet";

import PreviewRow from "./PreviewRow";

import styles from "./ImportPreviewSheet.module.scss";

interface ImportPreviewSheetProps {
  title: string;
  candidates: ImportCandidate[];
  selected: ReadonlySet<string>;
  onChange: (externalId: string, categoryId: string) => void;
  onToggle: (externalIds: string[], on: boolean) => void;
  onImport: () => void;
  onClose: () => void;
}

// The operations found, to tick, file under categories and import
const ImportPreviewSheet = ({
  title,
  candidates,
  selected,
  onChange,
  onToggle,
  onImport,
  onClose,
}: ImportPreviewSheetProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const expenseGroups = useCategoryGroups(state.categories, ["expense"]);
  const incomeGroups = useCategoryGroups(state.categories, ["income"]);
  const fresh = candidates.filter((c) => !c.duplicate);
  const picked = candidates.filter((c) => selected.has(c.externalId)).length;
  const allOn = fresh.length > 0 && fresh.every((c) => selected.has(c.externalId));
  const duplicates = candidates.length - fresh.length;

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onImport} disabled={picked === 0}>
            {tp("import.add", picked)}
          </Button>
        </>
      }
    >
      <div className={styles.head}>
        <p className={styles.found}>
          {tp("import.found", candidates.length)}
          {duplicates > 0 && ` · ${tp("import.duplicates", duplicates)}`}
        </p>
        {fresh.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onToggle(
                fresh.map((c) => c.externalId),
                !allOn,
              )
            }
          >
            {allOn ? t("import.none") : t("import.all")}
          </Button>
        )}
      </div>
      {candidates.length === 0 ? (
        <p className={styles.empty}>{t("import.empty")}</p>
      ) : (
        <ul className={styles.rows}>
          {candidates.map((candidate) => (
            <PreviewRow
              key={candidate.externalId}
              candidate={candidate}
              on={selected.has(candidate.externalId)}
              groups={candidate.type === "income" ? incomeGroups : expenseGroups}
              onToggle={(on) => onToggle([candidate.externalId], on)}
              onCategory={(categoryId) => onChange(candidate.externalId, categoryId)}
            />
          ))}
        </ul>
      )}
    </Sheet>
  );
};

export default ImportPreviewSheet;
