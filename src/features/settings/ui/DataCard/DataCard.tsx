"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { useStore } from "@/app/hooks";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { exportBackup, parseBackup } from "@/features/data/model/normalize";
import type { AppState } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import { downloadFile } from "@/shared/lib/download";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";

import DataRow from "./DataRow";

import styles from "./DataCard.module.scss";

// The data as a backup to download, a backup to restore, or a fresh start
const DataCard = () => {
  const { state, replace } = useStore();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, setPending] = useState<AppState | null>(null);
  const [resetting, setResetting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Reads the chosen backup and asks before replacing the data with it
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setSummary(null);
    const text = await file.text().catch(() => null);
    const parsed = text === null ? "settings.data.readFailed" : parseBackup(text);
    if (typeof parsed === "string") setError(t(parsed));
    else setPending(parsed);
  };

  // Replaces the data with the backup, with an undo
  const confirmImport = () => {
    if (!pending) return;
    replace(pending, t("settings.data.replacedUndo"));
    setPending(null);
    setSummary(
      t("settings.data.imported", {
        records: pending.transactions.length,
        categories: pending.categories.length,
        holdings: pending.savings.length + pending.investments.length,
      }),
    );
  };

  // Starts over in the same language, with an undo
  const confirmReset = () => {
    replace(
      { ...DEFAULT_STATE, settings: { ...DEFAULT_STATE.settings, locale: state.settings.locale } },
      t("settings.data.resetUndo"),
    );
    setResetting(false);
  };

  return (
    <Card
      id="data"
      title={t("settings.data.title")}
      subtitle={t("settings.data.subtitle")}
      icon="database"
      footer={t("settings.data.note")}
    >
      <div className={styles.rows}>
        <DataRow
          icon="arrowDown"
          title={t("settings.data.export")}
          caption={t("settings.data.export.caption")}
          action={
            <Button
              variant="ghost"
              onClick={() => downloadFile(`finance-backup-${todayISO()}.json`, exportBackup(state), "application/json")}
            >
              {t("settings.data.download")}
            </Button>
          }
        />
        <DataRow
          icon="database"
          title={t("settings.data.import")}
          caption={t("settings.data.import.caption")}
          action={
            <Button variant="ghost" onClick={() => fileInput.current?.click()}>
              {t("settings.data.chooseFile")}
            </Button>
          }
        />
        <DataRow
          danger
          icon="trash"
          title={t("settings.data.reset")}
          caption={t("settings.data.reset.caption")}
          action={
            <Button variant="danger" onClick={() => setResetting(true)}>
              {t("settings.data.resetButton")}
            </Button>
          }
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {summary && <p className={styles.summary}>{summary}</p>}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className={styles.file}
        aria-label={t("settings.data.import")}
        onChange={(event) => void onFile(event)}
      />

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirmImport}
        title={t("settings.data.replaceTitle")}
        message={t("settings.data.replaceMessage")}
        confirmLabel={t("settings.data.replace")}
      />
      <ConfirmDialog
        open={resetting}
        onClose={() => setResetting(false)}
        onConfirm={confirmReset}
        title={t("settings.data.resetTitle")}
        message={t("settings.data.resetMessage", {
          records: state.transactions.length,
          accounts: state.savings.length,
          investments: state.investments.length,
          debts: state.debts.length,
        })}
        confirmLabel={t("settings.data.resetButton")}
      />
    </Card>
  );
};

export default DataCard;
