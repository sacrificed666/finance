"use client";

import { useEffect, useRef, useState } from "react";

import { useStore } from "@/app/hooks";
import type { SavedView } from "@/features/data/model/types";
import {
  isFiltering,
  markReviewed,
  NO_FILTER,
  removeView,
  saveView,
  showsView,
  toReview,
  viewOf,
  type LedgerFilter,
  type LedgerKind,
  type LedgerScope,
} from "@/features/transactions/model/ledger";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import Icon from "@/shared/ui/Icon/Icon";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./LedgerCard.module.scss";

interface SavedViewsProps {
  filter: LedgerFilter;
  kind: LedgerKind;
  scope: LedgerScope;
  onApply: (filter: LedgerFilter, kind: LedgerKind, scope: LedgerScope) => void;
  onReview: (on: boolean) => void;
}

// The bank's entries to look over and the searches kept under a name
const SavedViews = ({ filter, kind, scope, onApply, onReview }: SavedViewsProps) => {
  const { state, update } = useStore();
  const { t, tp } = useI18n();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const form = useRef<HTMLFormElement>(null);

  // Moves to the name field once a view is being named
  useEffect(() => {
    if (naming) form.current?.querySelector("input")?.focus();
  }, [naming]);
  const views = state.settings.ledgerViews ?? [];
  const waiting = toReview(state.transactions);
  const current = views.find((view) => showsView(view, kind, scope, filter));
  const custom = isFiltering(filter) || scope !== "month";
  const canSave = custom && !filter.review && current === undefined;
  if (waiting.length === 0 && views.length === 0 && !canSave) return null;

  // Shows the entries a saved view keeps
  const apply = (view: SavedView) =>
    onApply(
      {
        ...NO_FILTER,
        query: view.query,
        categoryId: view.categoryId,
        accountId: view.accountId,
        tag: view.tag,
        timing: view.timing,
      },
      view.kind,
      view.scope,
    );
  // Keeps the shown search under the typed name
  const keep = () => {
    if (name.trim() === "") return;
    const view = viewOf(uid(), name, kind, scope, filter);
    update((s) => saveView(s, view), t("tx.views.saved", { name: view.name }));
    setNaming(false);
    setName("");
  };
  // Takes every waiting entry as it is
  const confirmAll = () =>
    update((s) => markReviewed(s, new Set(waiting.map((tx) => tx.id))), tp("tx.review.confirmed", waiting.length));

  return (
    <div className={styles.views}>
      {waiting.length > 0 && (
        <button
          type="button"
          aria-pressed={filter.review}
          onClick={() => onReview(!filter.review)}
          className={cx(styles.view, styles.reviewView, filter.review && styles.viewOn)}
        >
          <Icon name="check" size={12} strokeWidth={2.6} />
          {t("tx.review.chip")}
          <span className={styles.viewCount}>{waiting.length}</span>
        </button>
      )}
      {filter.review && waiting.length > 0 && (
        <Button variant="ghost" size="sm" onClick={confirmAll}>
          {tp("tx.review.confirmAll", waiting.length)}
        </Button>
      )}
      {views.map((view) => {
        const on = view.id === current?.id;
        return (
          <span key={view.id} className={styles.viewWrap}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => (on ? onApply(NO_FILTER, "expense", "month") : apply(view))}
              className={cx(styles.view, on && styles.viewOn)}
            >
              {view.name}
            </button>
            {on && (
              <button
                type="button"
                aria-label={t("tx.views.remove", { name: view.name })}
                onClick={() => update((s) => removeView(s, view.id), t("tx.views.removed", { name: view.name }))}
                className={styles.viewRemove}
              >
                <Icon name="close" size={11} strokeWidth={2.6} />
              </button>
            )}
          </span>
        );
      })}
      {canSave && !naming && (
        <button type="button" onClick={() => setNaming(true)} className={cx(styles.view, styles.viewAdd)}>
          <Icon name="plus" size={12} strokeWidth={2.6} />
          {t("tx.views.save")}
        </button>
      )}
      {naming && (
        <form
          ref={form}
          className={styles.viewForm}
          onSubmit={(event) => {
            event.preventDefault();
            keep();
          }}
        >
          <TextInput
            size="sm"
            aria-label={t("tx.views.name")}
            placeholder={t("tx.views.name")}
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
          />
          <Button size="sm" type="submit" disabled={name.trim() === ""}>
            {t("common.save")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNaming(false)}>
            {t("common.cancel")}
          </Button>
        </form>
      )}
    </div>
  );
};

export default SavedViews;
