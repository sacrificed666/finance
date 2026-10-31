"use client";

import { type FormEvent, type ReactNode, useEffect, useEffectEvent, useId, useLayoutEffect, useRef } from "react";

import { useScrollLock } from "@/shared/hooks/useScrollLock";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { ghostDim, ghostOut } from "@/shared/lib/ghost";

import Icon from "../Icon/Icon";

import styles from "./Sheet.module.scss";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onSubmit?: () => void;
  problem?: string | null;
  wide?: boolean;
}

// Submits closer together than this count as one
const DOUBLE_SUBMIT_MS = 400;

const FIRST_FIELD = 'input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled])';

// Focuses the first field with a mouse, or the panel on touch so no keyboard opens
const focusStart = (dialog: HTMLDialogElement) => {
  const fine = window.matchMedia("(pointer: fine)").matches;
  const field = fine ? dialog.querySelector<HTMLElement>(FIRST_FIELD) : null;
  (field ?? dialog).focus();
};

// A native modal: a bottom sheet on phones, a card from tablets up, maybe a form
const Sheet = ({ open, onClose, title, children, footer, onSubmit, problem, wide = false }: SheetProps) => {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const lastSubmit = useRef(0);
  const { t } = useI18n();

  useScrollLock(open);

  // Escape asks to close; the dialog stays until the page closes it
  const cancel = useEffectEvent((event: Event) => {
    event.preventDefault();
    onClose();
  });

  // A press on the dim closes a dialog that is not a form
  const pressDim = useEffectEvent((event: MouseEvent) => {
    if (!onSubmit && event.target === ref.current) onClose();
  });

  // Opens the dialog in the top layer; closing, a copy of it leaves the way it came
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    focusStart(dialog);
    return () => {
      if (dialog.open && dialog.childElementCount > 0) {
        ghostDim(styles.ghostDim);
        ghostOut(dialog, styles.ghostPanel);
      }
      if (dialog.open) dialog.close();
      if (restoreTo?.isConnected) restoreTo.focus();
    };
  }, [open]);

  // Listens for Escape and presses on the dim
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.addEventListener("cancel", cancel);
    dialog.addEventListener("mousedown", pressDim);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      dialog.removeEventListener("mousedown", pressDim);
    };
  }, []);

  // Submits once, even when Enter and a click arrive together
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const now = Date.now();
    if (now - lastSubmit.current < DOUBLE_SUBMIT_MS) return;
    lastSubmit.current = now;
    onSubmit?.();
  };

  const body = (
    <>
      <div className={styles.content}>{children}</div>
      {(Boolean(footer) || Boolean(problem)) && (
        <div className={styles.footer}>
          {problem && (
            <p aria-live="polite" className={styles.problem}>
              {problem}
            </p>
          )}
          {footer && <div className={styles.actions}>{footer}</div>}
        </div>
      )}
    </>
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cx(styles.sheet, wide ? styles.wide : styles.narrow)}
    >
      {open && (
        <>
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label={t("common.close")} className={styles.close}>
              <Icon name="close" size={15} strokeWidth={2.2} />
            </button>
          </div>
          {onSubmit ? (
            <form className={styles.body} onSubmit={submit} noValidate>
              {body}
            </form>
          ) : (
            <div className={styles.body}>{body}</div>
          )}
        </>
      )}
    </dialog>
  );
};

export default Sheet;
