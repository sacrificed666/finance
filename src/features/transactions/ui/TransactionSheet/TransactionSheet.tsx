"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { activeAccounts } from "@/features/accounts/model/accounts";
import { useAccountGroups } from "@/features/accounts/model/useAccountGroups";
import type { Transaction, TxType } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { applyLearnedName, applyLearnedRule, learnedName, learnedRule } from "@/features/import/model/import";
import { uploadReceipts } from "@/features/transactions/api/receipts";
import {
  entryProblem,
  initialEntryForm,
  knownTags,
  saveEntry,
  switchEntryType,
  type EntryForm,
} from "@/features/transactions/model/entryForm";
import { receiptEntry, shopEntry, type FiscalReceipt } from "@/features/transactions/model/fiscalReceipt";
import { frequentEntries, type FrequentEntry } from "@/features/transactions/model/frequent";
import { deleteEntries } from "@/features/transactions/model/ledger";
import { canRepeat } from "@/features/transactions/model/recurring";
import { useCategoryGroups } from "@/features/transactions/model/useCategoryGroups";
import FrequentChips from "@/features/transactions/ui/FrequentChips/FrequentChips";
import ReceiptPhotos from "@/features/transactions/ui/ReceiptPhotos/ReceiptPhotos";
import RecurringSheet from "@/features/transactions/ui/RecurringSheet/RecurringSheet";
import TagInput from "@/features/transactions/ui/TagInput/TagInput";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDate, todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";
import DateField from "@/shared/ui/DateField/DateField";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import FormRow from "@/shared/ui/FormRow/FormRow";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Sheet from "@/shared/ui/Sheet/Sheet";
import SwitchRow from "@/shared/ui/SwitchRow/SwitchRow";
import TextInput from "@/shared/ui/TextInput/TextInput";

import RememberName from "./RememberName";
import RememberRule from "./RememberRule";
import ScanReceipt from "./ScanReceipt";
import ShareFields from "./ShareFields";
import SplitFields from "./SplitFields";
import TransferFields from "./TransferFields";

import styles from "./TransactionSheet.module.scss";

interface TransactionSheetProps {
  target: Transaction | "new";
  month: string;
  date?: string;
  type?: TxType;
  onClose: () => void;
}

// Adds or edits an expense, income or transfer, split, tagged or with receipts
const TransactionSheet = ({ target: opened, month, date, type, onClose }: TransactionSheetProps) => {
  const { state, update } = useStore();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  const [copied, setCopied] = useState(false);
  const [repeating, setRepeating] = useState<string | null>(null);
  // A copy is a new entry that starts from the opened one's fields
  const target = copied ? "new" : opened;
  const [form, setForm] = useState<EntryForm>(() => initialEntryForm(state, opened, month, todayISO(), date, type));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [remember, setRemember] = useState(true);
  const [rememberName, setRememberName] = useState(true);
  const [renameOthers, setRenameOthers] = useState(false);
  const [moveOthers, setMoveOthers] = useState(false);
  const expenseGroups = useCategoryGroups(state.categories, ["expense"]);
  const incomeGroups = useCategoryGroups(state.categories, ["income"]);
  const accountGroups = useAccountGroups(
    state.savings,
    [{ value: "", label: t("common.notAssigned") }],
    [form.accountId],
  );
  const categoryGroups = form.type === "income" ? incomeGroups : expenseGroups;
  const canTransfer = activeAccounts(state.savings).length >= 2;
  const scheduled = target !== "new" && (target.recurringId !== undefined || target.subscriptionId !== undefined);
  const problem = entryProblem(state, form);
  const learned =
    target !== "new" && form.type === target.type && form.splits.length === 0 && form.categoryId !== ""
      ? learnedRule(state, target, form.categoryId)
      : null;
  const named =
    target !== "new" && form.type === target.type && form.splits.length === 0
      ? learnedName(state, target, form.note)
      : null;
  const types: { value: TxType; label: string }[] = [
    { value: "expense", label: t("tx.type.expense") },
    { value: "income", label: t("tx.type.income") },
    ...(canTransfer ? [{ value: "transfer" as const, label: t("tx.type.transfer") }] : []),
  ];
  // Changes some fields of the form
  const change = (fields: Partial<EntryForm>) => setForm({ ...form, ...fields });
  const frequent =
    target === "new" && form.type !== "transfer" && form.splits.length === 0
      ? frequentEntries(state, form.type, todayISO())
      : [];
  // Fills the form from an entry typed often; its amount only when it repeats
  const pick = (entry: FrequentEntry) =>
    change({
      categoryId: entry.categoryId,
      note: entry.note,
      accountId: entry.accountId,
      currency: entry.currency,
      amount: entry.amount === null ? form.amount : String(entry.amount),
    });

  // Keeps the entry and, when asked, a rule for the merchant's new category
  const save = () => {
    if (problem) return;
    update((s) => saveEntry(s, form, target, uid));
    if (learned && remember) {
      update(
        (s) => applyLearnedRule(s, learned, form.categoryId, moveOthers, uid()),
        moveOthers && learned.others.length > 0 ? tp("tx.learn.moved", learned.others.length) : t("tx.learn.saved"),
      );
    }
    if (named && rememberName) {
      update(
        (s) => applyLearnedName(s, named, form.note, form.categoryId, renameOthers, uid()),
        renameOthers && named.others.length > 0
          ? tp("tx.learn.renamed", named.others.length)
          : t("tx.learn.nameSaved", { name: form.note.trim() }),
      );
    }
    onClose();
  };

  // The bank's own words for an imported entry, shown once the note says else
  const bankWords = target === "new" ? undefined : (target.bank?.text ?? (target.externalId ? target.note : undefined));
  const bankHint = bankWords && bankWords !== form.note.trim() ? t("tx.bankWords", { text: bankWords }) : undefined;

  // Fills the entry from a receipt like the shop's last one, or says it is known
  const fromReceipt = (receipt: FiscalReceipt, photo: File): string | null => {
    const same = receiptEntry(state, receipt);
    if (same) return t("tx.scan.duplicate", { date: formatDate(same.date) });
    const shop = shopEntry(state, receipt);
    setForm({
      ...form,
      type: "expense",
      amount: String(receipt.amount),
      currency: "UAH",
      date: receipt.date,
      receipt: { fn: receipt.fn, id: receipt.id },
      note: form.note || (shop?.note ?? ""),
      categoryId: shop?.categoryId ?? form.categoryId,
      accountId: form.accountId || (shop?.accountId ?? ""),
    });
    void uploadReceipts([photo], form.attachmentIds).then(({ ids }) => {
      if (ids.length > 0) setForm((current) => ({ ...current, attachmentIds: [...current.attachmentIds, ...ids] }));
    });
    return t("tx.scan.found", {
      amount: formatMoney(receipt.amount, "UAH"),
      date: formatDate(receipt.date),
      time: receipt.time ?? "",
    });
  };

  // Turns the sheet into a new entry with the same fields, dated today
  const copy = () => {
    setCopied(true);
    setForm({ ...form, id: null, date: todayISO(), attachmentIds: [], splits: [], receipt: null });
  };

  // Keeps the entry's edits and opens a rule that starts from it
  const repeat = () => {
    if (problem || !form.id) return;
    update((s) => saveEntry(s, form, target, uid));
    setRepeating(form.id);
  };

  // Removes the entry, with an undo
  const remove = () => {
    const id = form.id;
    if (!id) return;
    update((s) => deleteEntries(s, new Set([id])), t("tx.deleted"));
    onClose();
  };

  const source = repeating ? state.transactions.find((tx) => tx.id === repeating) : undefined;
  if (source) return <RecurringSheet target="new" from={source} onClose={onClose} />;

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        onSubmit={save}
        problem={problem && t(problem.key, problem.params)}
        title={form.id ? t("tx.edit") : t("tx.new")}
        footer={
          <>
            {form.id && (
              <Button variant="danger" className={styles.delete} onClick={() => setConfirmDelete(true)}>
                {t("common.delete")}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={problem !== null}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <SegmentedControl<TxType>
          label={t("tx.kind")}
          options={types}
          value={form.type}
          onChange={(next) => setForm(switchEntryType(state, form, next))}
        />
        {!canTransfer && <p className={styles.transferNote}>{t("tx.transferNeedsTwo")}</p>}
        {target === "new" && form.type === "expense" && <ScanReceipt onFound={fromReceipt} />}
        <FrequentChips entries={frequent} onPick={pick} />

        {form.type === "transfer" ? (
          <TransferFields form={form} onChange={change} />
        ) : (
          <>
            <MoneyField
              label={t("common.amount")}
              value={form.amount}
              onChange={(amount) => change({ amount })}
              currency={form.currency}
              onCurrency={(currency) => change({ currency })}
              currencyLabel={t("common.currency")}
              hero
            />
            <Field label={t("common.category")}>
              <OptionPicker
                label={t("common.category")}
                value={form.categoryId}
                onChange={(categoryId) => change({ categoryId })}
                groups={categoryGroups}
              />
            </Field>
            {learned && (
              <RememberRule
                learned={learned}
                categoryName={category(state.categories.find((entry) => entry.id === form.categoryId))}
                remember={remember}
                onRemember={setRemember}
                moveOthers={moveOthers}
                onMoveOthers={setMoveOthers}
              />
            )}
            {!scheduled && form.share === null && (
              <SplitFields form={form} target={target} groups={categoryGroups} onChange={change} />
            )}
            {target === "new" && form.type === "expense" && form.splits.length === 0 && (
              <ShareFields form={form} onChange={change} />
            )}
            <Field
              label={t("common.account")}
              hint={activeAccounts(state.savings).length === 0 ? t("tx.account.none") : t("tx.account.hint")}
            >
              <OptionPicker
                label={t("common.account")}
                value={form.accountId}
                onChange={(accountId) =>
                  change({
                    accountId,
                    currency: state.savings.find((account) => account.id === accountId)?.currency ?? form.currency,
                  })
                }
                groups={accountGroups}
              />
            </Field>
          </>
        )}

        <FormRow wide="last">
          <Field label={t("common.date")}>
            <DateField value={form.date} onChange={(value) => change({ date: value })} />
          </Field>
          <Field label={t("common.note")} hint={bankHint}>
            <TextInput
              placeholder={t("common.optional")}
              value={form.note}
              onChange={(event) => change({ note: event.target.value })}
            />
          </Field>
        </FormRow>
        {named && (
          <RememberName
            learned={named}
            name={form.note}
            remember={rememberName}
            onRemember={setRememberName}
            renameOthers={renameOthers}
            onRenameOthers={setRenameOthers}
          />
        )}
        <FieldSet label={t("tx.tags")} hint={t("tx.tags.hint")}>
          <TagInput
            value={form.tags}
            onChange={(tags) => change({ tags })}
            suggestions={knownTags(state)}
            placeholder={t("common.example", { value: t("tx.tags.placeholder") })}
            removeLabel={(tag) => t("tx.tags.remove", { tag })}
          />
        </FieldSet>
        {form.type !== "transfer" && (
          <SwitchRow
            title={t("tx.excluded")}
            hint={t("tx.excluded.hint")}
            checked={form.excluded}
            onChange={(excluded) => change({ excluded })}
          />
        )}
        {form.type !== "transfer" && (
          <FieldSet label={t("tx.receipt")}>
            <ReceiptPhotos
              value={form.attachmentIds}
              onChange={(attachmentIds) => change({ attachmentIds })}
              labels={{
                add: t("tx.receipt.add"),
                remove: t("tx.receipt.remove"),
                open: t("tx.receipt.open"),
                uploading: t("tx.receipt.uploading"),
                failed: t("tx.receipt.failed"),
              }}
            />
          </FieldSet>
        )}
        {target !== "new" && (
          <div className={styles.actions}>
            <Button variant="ghost" className={styles.action} onClick={copy}>
              {t("tx.copy")}
            </Button>
            {canRepeat(target) && form.type !== "transfer" && form.splits.length === 0 && (
              <Button variant="ghost" className={styles.action} disabled={problem !== null} onClick={repeat}>
                {t("tx.repeat")}
              </Button>
            )}
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={t("tx.deleteTitle")}
        message={t("common.deletePermanent")}
      />
    </>
  );
};

export default TransactionSheet;
