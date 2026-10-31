"use client";

import { useStore } from "@/app/hooks";
import { suggestSubscriptions, type SubscriptionSuggestion } from "@/features/import/model/import";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./SubscriptionsCard.module.scss";

interface SuggestionsProps {
  onAdd: (suggestion: SubscriptionSuggestion) => void;
}

// Whether a stored value is a list of texts
const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

// Up to three charges that repeat like subscriptions, to add or dismiss
const Suggestions = ({ onAdd }: SuggestionsProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const [dismissed, setDismissed] = usePersistentState<string[]>("subs.dismissed", [], isTextList);
  const suggestions = suggestSubscriptions(state, todayISO())
    .filter((suggestion) => !dismissed.includes(suggestion.key))
    .slice(0, 3);
  if (suggestions.length === 0) return null;

  return (
    <div className={styles.suggestions}>
      <p className={styles.suggestionsTitle}>{t("tx.subs.suggest.title")}</p>
      <ul className={styles.suggestionList}>
        {suggestions.map((suggestion) => (
          <li key={suggestion.key} className={styles.suggestion}>
            <span className={styles.body}>
              <span className={styles.suggestionName}>{suggestion.name}</span>
              <span className={styles.suggestionMeta}>
                {formatMoney(suggestion.amount, suggestion.currency)} · {tp("tx.subs.suggest.seen", suggestion.months)}
              </span>
            </span>
            <Button size="sm" onClick={() => onAdd(suggestion)}>
              {t("common.add")}
            </Button>
            <button
              type="button"
              onClick={() => setDismissed([...dismissed, suggestion.key])}
              aria-label={t("tx.subs.suggest.dismiss")}
              title={t("tx.subs.suggest.dismiss")}
              className={styles.dismiss}
            >
              <Icon name="close" size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Suggestions;
