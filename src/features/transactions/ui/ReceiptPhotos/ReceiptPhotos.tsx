"use client";

import { useRef, useState } from "react";

import { uploadReceipts } from "@/features/transactions/api/receipts";
import { cx } from "@/shared/lib/cx";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./ReceiptPhotos.module.scss";

interface ReceiptPhotosProps {
  value: string[];
  onChange: (ids: string[]) => void;
  labels: { add: string; remove: string; open: string; uploading: string; failed: string };
}

// An entry keeps at most this many photos
const MAX_PHOTOS = 4;

// An entry's receipt photos as thumbnails that open them, and a button for more
const ReceiptPhotos = ({ value, onChange, labels }: ReceiptPhotosProps) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  // Shrinks and stores the chosen photos; the ones stored before a failure stay
  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(false);
    const { ids, failed } = await uploadReceipts([...files].slice(0, MAX_PHOTOS - value.length));
    if (ids.length > 0) onChange([...value, ...ids]);
    setError(failed);
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  return (
    <div>
      <div className={styles.photos}>
        {value.map((id) => (
          <span key={id} className={styles.photo}>
            <a
              href={`/api/attachments/${id}`}
              target="_blank"
              rel="noreferrer"
              aria-label={labels.open}
              className={styles.link}
            >
              <img src={`/api/attachments/${id}`} alt="" className={styles.image} />
            </a>
            <button
              type="button"
              aria-label={labels.remove}
              onClick={() => onChange(value.filter((existing) => existing !== id))}
              className={styles.remove}
            >
              <Icon name="close" size={11} strokeWidth={2.6} />
            </button>
          </span>
        ))}
        {value.length < MAX_PHOTOS && (
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className={styles.add}>
            <Icon name={busy ? "refresh" : "plus"} size={16} className={cx(busy && styles.spinning)} />
            {busy ? labels.uploading : labels.add}
          </button>
        )}
      </div>
      {error && <p className={styles.error}>{labels.failed}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className={styles.file}
        onChange={(event) => void upload(event.target.files)}
      />
    </div>
  );
};

export default ReceiptPhotos;
