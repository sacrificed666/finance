"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { useI18n } from "@/shared/i18n/useI18n";
import { ghostOut } from "@/shared/lib/ghost";

import Button from "../Button/Button";
import Icon from "../Icon/Icon";

import styles from "./Toast.module.scss";

interface ToastProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss?: () => void;
  timeoutMs?: number;
}

// A floating message with one action, such as Undo, that closes after a while
const Toast = ({ message, actionLabel, onAction, onDismiss, timeoutMs = 9000 }: ToastProps) => {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  // Leaving, a copy of the toast sinks away while the next one rises
  useLayoutEffect(() => {
    const toast = ref.current;
    return () => ghostOut(toast, styles.leaving);
  }, []);

  // Closes by itself after a while; a new message mounts a new toast
  useEffect(() => {
    if (!onDismiss) return;
    const timer = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(timer);
  }, [onDismiss, timeoutMs]);

  return (
    <output aria-live="polite" className={styles.region}>
      <div ref={ref} className={styles.toast}>
        <span className={styles.message}>{message}</span>
        <Button
          variant="ghost"
          size="sm"
          className={styles.action}
          onClick={() => {
            onAction();
            onDismiss?.();
          }}
        >
          {actionLabel}
        </Button>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label={t("common.dismiss")} className={styles.dismiss}>
            <Icon name="close" size={13} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </output>
  );
};

export default Toast;
