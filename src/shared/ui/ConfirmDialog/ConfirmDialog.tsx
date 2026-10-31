"use client";

import { useI18n } from "@/shared/i18n/useI18n";

import Button from "../Button/Button";
import Sheet from "../Sheet/Sheet";

import styles from "./ConfirmDialog.module.scss";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}

// Asks before something is deleted; the red button confirms and closes
const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel }: ConfirmDialogProps) => {
  const { t } = useI18n();
  // Closed, the sheet leaves the page, so its copy fades out with the last words
  if (!open) return null;
  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel ?? t("common.delete")}
          </Button>
        </>
      }
    >
      <p className={styles.message}>{message}</p>
    </Sheet>
  );
};

export default ConfirmDialog;
