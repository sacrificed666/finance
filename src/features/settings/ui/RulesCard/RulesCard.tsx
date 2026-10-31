"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { addRule, removeRule, ruleReady } from "@/features/settings/model/rules";
import { useCategoryGroups } from "@/features/transactions/model/useCategoryGroups";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import Icon from "@/shared/ui/Icon/Icon";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./RulesCard.module.scss";

type RuleType = "expense" | "income";

// Words in a bank description that file an imported entry under a category
const RulesCard = () => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const category = useCategoryName();
  const [match, setMatch] = useState("");
  const [rename, setRename] = useState("");
  const [type, setType] = useState<RuleType>("expense");
  const [categoryId, setCategoryId] = useState("");
  const expenseGroups = useCategoryGroups(state.categories, ["expense"]);
  const incomeGroups = useCategoryGroups(state.categories, ["income"]);
  const categories = new Map(state.categories.map((entry) => [entry.id, entry]));
  const draft = { match, categoryId, type, rename };
  const ready = ruleReady(state, draft);

  // Adds the rule and clears the words for the next one
  const add = () => {
    if (!ready) return;
    update((s) => addRule(s, draft, uid));
    setMatch("");
    setRename("");
  };

  return (
    <Card id="rules" title={t("rules.title")} subtitle={t("rules.subtitle")} icon="sliders">
      <div className={styles.form}>
        <TextInput
          value={match}
          onChange={(event) => setMatch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
          placeholder={t("rules.matchPlaceholder")}
          aria-label={t("rules.match")}
          maxLength={80}
        />
        <TextInput
          value={rename}
          onChange={(event) => setRename(event.target.value)}
          placeholder={t("rules.renamePlaceholder")}
          aria-label={t("rules.rename")}
          maxLength={80}
        />
        <OptionPicker
          label={t("common.category")}
          value={categoryId}
          onChange={setCategoryId}
          groups={type === "income" ? incomeGroups : expenseGroups}
        />
        <SegmentedControl<RuleType>
          label={t("tx.kind")}
          options={[
            { value: "expense", label: t("tx.type.expense") },
            { value: "income", label: t("tx.type.income") },
          ]}
          value={type}
          onChange={(next) => {
            setType(next);
            setCategoryId("");
          }}
        />
        <Button onClick={add} disabled={!ready}>
          <Icon name="plus" size={14} />
          {t("rules.add")}
        </Button>
      </div>

      {state.rules.length === 0 ? (
        <p className={styles.empty}>{t("rules.empty")}</p>
      ) : (
        <ul className={styles.rows}>
          {state.rules.map((rule) => {
            const entry = categories.get(rule.categoryId);
            return (
              <li key={rule.id} className={styles.row}>
                <span className={styles.text}>
                  <span className={styles.match}>“{rule.match}”</span>
                  <span className={styles.arrow}> → </span>
                  {rule.rename && <span className={styles.rename}>{rule.rename} · </span>}
                  <span className={styles.category}>
                    {entry?.icon} {category(entry)}
                  </span>
                </span>
                <span className={cx(styles.type, rule.type === "income" && styles.income)}>
                  {rule.type === "income" ? t("tx.type.income") : t("tx.type.expense")}
                </span>
                <button
                  type="button"
                  aria-label={t("rules.remove", { match: rule.match })}
                  onClick={() => update((s) => removeRule(s, rule.id))}
                  className={styles.remove}
                >
                  <Icon name="trash" size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

export default RulesCard;
