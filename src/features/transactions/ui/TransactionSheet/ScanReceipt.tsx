"use client";

import { useRef, useState } from "react";

import { parseFiscalQr, type FiscalReceipt } from "@/features/transactions/model/fiscalReceipt";
import { readQr } from "@/features/transactions/model/qrReader";
import { useI18n } from "@/shared/i18n/useI18n";
import Button from "@/shared/ui/Button/Button";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./TransactionSheet.module.scss";

interface ScanReceiptProps {
  onFound: (receipt: FiscalReceipt, photo: File) => string | null;
}

// Fills the entry from a photo of a fiscal receipt's QR code: sum, day and shop
const ScanReceipt = ({ onFound }: ScanReceiptProps) => {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Reads the photo's code and hands the receipt on, or says what went wrong
  const read = async (photo: File | undefined) => {
    if (!photo) return;
    setBusy(true);
    setNote(null);
    const text = await readQr(photo).catch(() => null);
    const receipt = text ? parseFiscalQr(text) : null;
    if (input.current) input.current.value = "";
    setBusy(false);
    setNote(receipt ? onFound(receipt, photo) : t("tx.scan.none"));
  };

  return (
    <div className={styles.scan}>
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => input.current?.click()}>
        <Icon name="qr" size={14} />
        {busy ? t("tx.scan.busy") : t("tx.scan")}
      </Button>
      {note && <output className={styles.scanNote}>{note}</output>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label={t("tx.scan")}
        onChange={(event) => void read(event.target.files?.[0])}
      />
    </div>
  );
};

export default ScanReceipt;
