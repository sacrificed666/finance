"use client";

import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef } from "react";

import { type Command, COMMAND_GROUPS } from "@/features/commands/model/palette";
import { usePaletteCommands } from "@/features/commands/model/usePaletteCommands";
import { useScrollLock } from "@/shared/hooks/useScrollLock";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import Icon from "@/shared/ui/Icon/Icon";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import Money from "@/shared/ui/Money/Money";
import ToneMark from "@/shared/ui/ToneMark/ToneMark";

import styles from "./PaletteDialog.module.scss";

interface PaletteDialogProps {
  query: string;
  onQuery: (query: string) => void;
  active: number;
  onActive: (index: number) => void;
  onClose: () => void;
}

// A page's own disc, an icon's grey one or an emoji's on the left of a command
const Mark = ({ mark }: { mark: Command["mark"] }) => {
  if ("icon" in mark && mark.tone) return <ToneMark icon={mark.icon} tone={mark.tone} />;
  if ("icon" in mark) {
    return (
      <span className={styles.glyph}>
        <Icon name={mark.icon} size={16} />
      </span>
    );
  }
  return (
    <IconDisc colorSlot={mark.colorSlot} className={styles.disc}>
      {mark.emoji}
    </IconDisc>
  );
};

// The note or amount on the right of a command
const Trailing = ({ trailing }: { trailing: NonNullable<Command["trailing"]> }) => {
  const { t } = useI18n();
  if ("here" in trailing) return <span className={styles.here}>{t("palette.here")}</span>;
  return (
    <Money
      amount={trailing.amount}
      currency={trailing.currency}
      sign={trailing.sign}
      compact
      className={cx(styles.amount, styles[trailing.tone], trailing.strong && styles.strong)}
    />
  );
};

// The palette: a search of actions, pages, accounts and entries; Enter runs
const PaletteDialog = ({ query, onQuery, active, onActive, onClose }: PaletteDialogProps) => {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const ordered = usePaletteCommands(query, onClose);
  const current = Math.min(active, Math.max(0, ordered.length - 1));

  useScrollLock(true);

  // Opens in the top layer with typing in the search field, and gives the focus back
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const restoreTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    inputRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (restoreTo?.isConnected) restoreTo.focus();
    };
  }, []);

  const activeId = ordered[current]?.id;

  // The active command stays in view
  useEffect(() => {
    if (activeId === undefined) return;
    listRef.current?.querySelector("[data-active]")?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  // Arrows move through the results and Enter runs one
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "ArrowDown" && ordered.length > 0) {
      event.preventDefault();
      onActive((current + 1) % ordered.length);
    } else if (event.key === "ArrowUp" && ordered.length > 0) {
      event.preventDefault();
      onActive((current - 1 + ordered.length) % ordered.length);
    } else if (event.key === "Enter") {
      const command = ordered[current];
      if (!command) return;
      event.preventDefault();
      command.run();
    }
  });

  // Escape asks to close; the palette goes once the page closes it
  const cancel = useEffectEvent((event: Event) => {
    event.preventDefault();
    onClose();
  });

  // A press on the dim around the panel closes the palette
  const pressDim = useEffectEvent((event: MouseEvent) => {
    if (event.target === dialogRef.current) onClose();
  });

  // Listens for keys, Escape and presses on the dim
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.addEventListener("keydown", onKeyDown);
    dialog.addEventListener("cancel", cancel);
    dialog.addEventListener("mousedown", pressDim);
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      dialog.removeEventListener("cancel", cancel);
      dialog.removeEventListener("mousedown", pressDim);
    };
  }, []);

  return (
    <dialog ref={dialogRef} aria-label={t("palette.title")} tabIndex={-1} className={styles.panel}>
      <div className={styles.searchRow}>
        <Icon name="search" size={18} className={styles.searchIcon} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={t("palette.placeholder")}
          aria-label={t("palette.title")}
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={ordered[current] ? `${listId}-${String(current)}` : undefined}
          className={styles.search}
        />
        <kbd className={styles.escape}>Esc</kbd>
      </div>

      <ul ref={listRef} id={listId} role="listbox" className={styles.list}>
        {ordered.length === 0 && <li className={styles.empty}>{t("palette.empty", { query: query.trim() })}</li>}
        {COMMAND_GROUPS.map((group) => {
          const items = ordered.filter((command) => command.group === group);
          if (items.length === 0) return null;
          return (
            <li key={group} role="presentation" className={styles.group}>
              <p className={styles.groupTitle}>{t(`palette.group.${group}`)}</p>
              <ul role="presentation">
                {items.map((command) => {
                  const index = ordered.indexOf(command);
                  const isActive = index === current;
                  return (
                    <li
                      key={command.id}
                      id={`${listId}-${String(index)}`}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive ? "" : undefined}
                      onMouseMove={() => {
                        if (!isActive) onActive(index);
                      }}
                      onClick={command.run}
                      className={cx(styles.option, isActive && styles.activeOption)}
                    >
                      <Mark mark={command.mark} />
                      <span className={styles.text}>
                        <span className={styles.label}>{command.label}</span>
                        {command.hint && <span className={styles.hint}>{command.hint}</span>}
                      </span>
                      {command.trailing && (
                        <span className={styles.trailing}>
                          <Trailing trailing={command.trailing} />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>

      <p className={styles.footer}>
        <span>
          <kbd className={styles.key}>↑↓</kbd> {t("palette.hint.move")}
        </span>
        <span>
          <kbd className={styles.key}>Enter</kbd> {t("palette.hint.open")}
        </span>
      </p>
    </dialog>
  );
};

export default PaletteDialog;
