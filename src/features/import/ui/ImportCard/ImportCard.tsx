"use client";

import { useRef, useState } from "react";

import { useStore } from "@/app/hooks";
import { csvDraft, decodeCsv, type CsvDraft } from "@/features/import/model/csv";
import { applyImport, prepareImport, type ImportCandidate } from "@/features/import/model/import";
import CsvSheet from "@/features/import/ui/CsvSheet/CsvSheet";
import ImportPreviewSheet from "@/features/import/ui/ImportPreviewSheet/ImportPreviewSheet";
import { useI18n } from "@/shared/i18n/useI18n";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";

import MonobankPanel from "./MonobankPanel";

import styles from "./ImportCard.module.scss";

interface Preview {
  title: string;
  candidates: ImportCandidate[];
}

// Brings operations in from Monobank or from a bank's CSV statement
const ImportCard = () => {
  const { state, update } = useStore();
  const { t, tp } = useI18n();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [csv, setCsv] = useState<CsvDraft | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Prepares the operations found and ticks the ones not in the app yet
  const openPreview = (title: string, found: ImportCandidate[]) => {
    const candidates = prepareImport(state, found);
    setSelected(new Set(candidates.filter((c) => !c.duplicate).map((c) => c.externalId)));
    setPreview({ title, candidates });
  };

  // Reads a chosen statement and opens its column mapping
  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    const draft = csvDraft(file.name, decodeCsv(await file.arrayBuffer()));
    if (fileInput.current) fileInput.current.value = "";
    setError(draft ? null : t("import.csv.empty"));
    setCsv(draft);
  };

  // Ticks or unticks some operations
  const toggle = (ids: string[], on: boolean) =>
    setSelected((current) => {
      const chosen = new Set(ids);
      return on ? new Set([...current, ...ids]) : new Set([...current].filter((id) => !chosen.has(id)));
    });

  // Files an operation under another category
  const recategorise = (externalId: string, categoryId: string) =>
    setPreview((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((c) =>
              c.externalId === externalId ? Object.assign({}, c, { categoryId }) : c,
            ),
          }
        : current,
    );

  // Imports the ticked operations with an undo
  const finish = () => {
    if (!preview) return;
    const picked = preview.candidates.filter((c) => selected.has(c.externalId));
    update((s) => applyImport(s, picked, uid), tp("import.done", picked.length));
    setPreview(null);
  };

  return (
    <Card id="import" title={t("import.title")} subtitle={t("import.subtitle")} icon="card">
      <div className={styles.panels}>
        <MonobankPanel
          busy={status !== null}
          onStatus={setStatus}
          onError={setError}
          onFound={(found) => openPreview(t("import.mono.title"), found)}
        />
        <div className={styles.csv}>
          <div className={styles.csvText}>
            <p className={styles.panelTitle}>{t("import.csv.title")}</p>
            <p className={styles.caption}>{t("import.csv.caption")}</p>
          </div>
          <Button variant="ghost" onClick={() => fileInput.current?.click()}>
            {t("settings.data.chooseFile")}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv,text/plain"
            aria-label={t("import.csv.title")}
            className={styles.file}
            onChange={(event) => void pickFile(event.target.files?.[0])}
          />
        </div>
      </div>

      {status && (
        <p className={styles.status} aria-live="polite">
          {status}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {csv && (
        <CsvSheet
          draft={csv}
          onChange={setCsv}
          onClose={() => setCsv(null)}
          onPreview={(found) => {
            setCsv(null);
            openPreview(t("import.csv.title"), found);
          }}
        />
      )}
      {preview && (
        <ImportPreviewSheet
          title={preview.title}
          candidates={preview.candidates}
          selected={selected}
          onToggle={toggle}
          onChange={recategorise}
          onImport={finish}
          onClose={() => setPreview(null)}
        />
      )}
    </Card>
  );
};

export default ImportCard;
