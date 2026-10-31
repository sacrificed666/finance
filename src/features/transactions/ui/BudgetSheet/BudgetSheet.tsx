"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import type { Budget, BudgetPeriod } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import {
  budgetSpent,
  deleteBudget,
  isYearly,
  moveBetweenBudgets,
  saveBudget,
  suggestedLimit,
} from "@/features/transactions/model/budgets";
import { budgetLimit } from "@/features/transactions/model/categories";
import { useCategoryGroups } from "@/features/transactions/model/useCategoryGroups";
import { useI18n } from "@/shared/i18n/useI18n";
import { CURRENCY_SYMBOL, formatMoney, parseAmount, type Currency } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Sheet from "@/shared/ui/Sheet/Sheet";
import SwitchRow from "@/shared/ui/SwitchRow/SwitchRow";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./BudgetSheet.module.scss";

interface BudgetForm {
  editingId: string | null;
  categoryId: string;
  limit: string;
  currency: Currency;
  rollover: boolean;
  period: BudgetPeriod;
}

interface BudgetSheetProps {
  target: Budget | "new";
  month: string;
  onClose: () => void;
}

// Sets a monthly or yearly limit on an expense category
const BudgetSheet = ({ target, month, onClose }: BudgetSheetProps) => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const category = useCategoryName();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const expenseCategories = state.categories.filter((entry) => entry.kind === "expense");
  const budgeted = new Set(state.budgets.map((budget) => budget.categoryId));
  const [form, setForm] = useState<BudgetForm>(() =>
    target === "new"
      ? {
          editingId: null,
          categoryId: expenseCategories.find((entry) => !budgeted.has(entry.id))?.id ?? "",
          limit: "",
          currency: state.settings.baseCurrency,
          rollover: false,
          period: "monthly",
        }
      : {
          editingId: target.categoryId,
          categoryId: target.categoryId,
          limit: String(target.limit),
          currency: target.currency,
          rollover: target.rollover === true,
          period: target.period ?? "monthly",
        },
  );
  const options = expenseCategories.filter((entry) => !budgeted.has(entry.id) || entry.id === form.editingId);
  const categoryGroups = useCategoryGroups(options, ["expense"]);

  const limit = parseAmount(form.limit);
  const valid = Number.isFinite(limit) && limit > 0 && form.categoryId !== "";
  let problem: string | null = null;
  if (form.categoryId === "") problem = t("problem.category");
  else if (!valid) problem = t("tx.budget.problem.limit");

  // Keeps the budget, replacing the one it was opened with
  const save = () => {
    if (!valid) return;
    const budget: Budget = {
      categoryId: form.categoryId,
      limit,
      currency: form.currency,
      rollover: form.period === "monthly" && form.rollover ? true : undefined,
      period: form.period === "yearly" ? "yearly" : undefined,
      moved: target === "new" || form.period === "yearly" ? undefined : target.moved,
    };
    update((s) => saveBudget(s, budget, form.editingId));
    onClose();
  };

  const yearly = form.period === "yearly";
  const suggestion = form.categoryId === "" ? 0 : suggestedLimit(state, form.categoryId, form.currency, month, yearly);
  const stored = target === "new" ? undefined : state.budgets.find((budget) => budget.categoryId === target.categoryId);
  const others = state.budgets.filter((budget) => budget.categoryId !== form.editingId && !isYearly(budget));
  const rest =
    stored && !isYearly(stored)
      ? Math.max(0, budgetLimit(state, stored, month) - budgetSpent(state, stored, month))
      : 0;
  const moveGroups = useCategoryGroups(
    state.categories.filter((entry) => others.some((budget) => budget.categoryId === entry.id)),
    ["expense"],
  );
  const [moveTo, setMoveTo] = useState("");
  const [moveAmount, setMoveAmount] = useState(() => (rest > 0 ? String(Math.floor(rest)) : ""));
  const moving = parseAmount(moveAmount);
  const canMove = stored !== undefined && moveTo !== "" && Number.isFinite(moving) && moving > 0;

  // Moves part of this month's rest into another budget and closes
  const move = () => {
    if (!canMove) return;
    const into = category(state.categories.find((entry) => entry.id === moveTo));
    update(
      (s) => moveBetweenBudgets(s, stored.categoryId, moveTo, month, moving),
      t("tx.budget.moved", { amount: formatMoney(moving, stored.currency), category: into }),
    );
    onClose();
  };

  // Removes the budget, with an undo
  const remove = () => {
    const id = form.editingId;
    if (!id) return;
    update((s) => deleteBudget(s, id), t("tx.budget.deleted"));
    onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        onSubmit={save}
        problem={problem}
        title={form.editingId ? t("tx.budget.edit") : t("tx.budget.new")}
        footer={
          <>
            {form.editingId && (
              <Button variant="danger" className={styles.delete} onClick={() => setConfirmDelete(true)}>
                {t("common.delete")}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!valid}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <Field label={t("tx.budget.category")} hint={t("tx.budget.category.hint")}>
          <OptionPicker
            label={t("tx.budget.category")}
            value={form.categoryId}
            onChange={(categoryId) => setForm({ ...form, categoryId })}
            groups={categoryGroups}
          />
        </Field>
        <FieldSet label={t("tx.budget.period")}>
          <SegmentedControl<BudgetPeriod>
            label={t("tx.budget.period")}
            options={[
              { value: "monthly", label: t("tx.budget.period.monthly") },
              { value: "yearly", label: t("tx.budget.period.yearly") },
            ]}
            value={form.period}
            onChange={(period) => setForm({ ...form, period })}
          />
        </FieldSet>
        <MoneyField
          label={form.period === "yearly" ? t("tx.budget.limitYear") : t("tx.budget.limit")}
          value={form.limit}
          onChange={(value) => setForm({ ...form, limit: value })}
          currency={form.currency}
          onCurrency={(currency) => setForm({ ...form, currency })}
          currencyLabel={t("common.currency")}
          hero
        />
        {suggestion > 0 && Math.abs(suggestion - limit) >= 1 && (
          <button
            type="button"
            onClick={() => setForm({ ...form, limit: String(suggestion) })}
            className={styles.suggest}
          >
            {t(yearly ? "tx.budget.suggestYear" : "tx.budget.suggestMonth", {
              amount: formatMoney(suggestion, form.currency),
            })}
          </button>
        )}
        {form.period === "monthly" && (
          <SwitchRow
            className={styles.rollover}
            title={t("tx.budget.rollover")}
            hint={t("tx.budget.rollover.hint")}
            checked={form.rollover}
            onChange={(rollover) => setForm({ ...form, rollover })}
          />
        )}
        {stored && !yearly && others.length > 0 && (
          <FieldSet
            label={t("tx.budget.move")}
            hint={t("tx.budget.move.hint", { amount: formatMoney(rest, stored.currency) })}
          >
            <div className={styles.move}>
              <OptionPicker label={t("tx.budget.moveTo")} value={moveTo} onChange={setMoveTo} groups={moveGroups} />
              <TextInput
                inputMode="decimal"
                aria-label={t("tx.budget.moveAmount")}
                prefix={CURRENCY_SYMBOL[stored.currency]}
                value={moveAmount}
                onChange={(event) => setMoveAmount(event.target.value)}
              />
              <Button variant="ghost" disabled={!canMove} onClick={move}>
                {t("tx.budget.moveAction")}
              </Button>
            </div>
          </FieldSet>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={t("tx.budget.deleteTitle")}
        message={t("tx.budget.deleteMessage")}
      />
    </>
  );
};

export default BudgetSheet;
