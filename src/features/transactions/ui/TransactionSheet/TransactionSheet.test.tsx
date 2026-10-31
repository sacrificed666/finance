import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, SavingsAccount, Transaction } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import TransactionSheet from "./TransactionSheet";

const scan = vi.hoisted(() => ({
  readQr: vi.fn<(photo: Blob) => Promise<string | null>>(),
  upload: vi.fn<() => Promise<{ ids: string[]; failed: boolean }>>(),
}));

vi.mock("@/features/transactions/model/qrReader", () => ({ readQr: scan.readQr }));
vi.mock("@/features/transactions/api/receipts", () => ({ uploadReceipts: scan.upload }));

const RECEIPT = "https://cabinet.tax.gov.ua/cashregs/check?date=20261014&time=1130&id=45&sm=780.00&fn=3000898168";

// An account in a currency
const account = (id: string, currency: SavingsAccount["currency"] = "UAH"): SavingsAccount => ({
  id,
  name: id,
  icon: "💳",
  kind: "card",
  currency,
  openingBalance: 0,
});

const state: AppState = { ...DEFAULT_STATE, savings: [account("card"), account("dollars", "USD")] };

// A coffee bought with the card and imported from the bank
const coffee: Transaction = {
  id: "coffee",
  type: "expense",
  amount: 120,
  currency: "UAH",
  categoryId: "cat-groceries",
  date: "2026-10-02",
  note: "AROMA KAVA 22",
  externalId: "bank-1",
  accountId: "card",
};

// Picks an option of the last picker of a name, the newest part of a split
const pick = async (user: ReturnType<typeof renderWithStore>["user"], picker: RegExp, option: RegExp) => {
  await user.click(screen.getAllByRole("combobox", { name: picker }).at(-1)!);
  await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: option }));
};

describe("TransactionSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-15T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fills a new entry from one typed often, keeping the amount when it repeats", async () => {
    const often = ["2026-10-03", "2026-10-09"].map((date, index) =>
      Object.assign(structuredClone(coffee), { id: `latte${String(index)}`, date, amount: 85, note: "Latte" }),
    );
    const { user, probe } = renderWithStore(
      <TransactionSheet target="new" month="2026-10" onClose={vi.fn<() => void>()} />,
      { state: { ...state, transactions: often } },
    );
    await user.click(screen.getByRole("button", { name: /Latte/u }));
    expect(screen.getAllByPlaceholderText("0")[0]).toHaveValue("85");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.transactions.at(-1)).toMatchObject({
      amount: 85,
      note: "Latte",
      categoryId: "cat-groceries",
      accountId: "card",
    });
  });

  it("leaves an entry out of reports and budgets, and lets it back in", async () => {
    const { user, probe } = renderWithStore(
      <TransactionSheet target={coffee} month="2026-10" onClose={vi.fn<() => void>()} />,
      { state: { ...state, transactions: [coffee] } },
    );
    const leaveOut = screen.getByRole("switch", { name: "Leave out of reports and budgets" });
    expect(leaveOut).not.toBeChecked();
    await user.click(leaveOut);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.transactions[0]).toMatchObject({ id: "coffee", excluded: true });
  });

  it("adds an expense with a tag", async () => {
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<TransactionSheet target="new" month="2026-10" onClose={onClose} />, {
      state,
    });
    expect(screen.getByText("Enter an amount greater than zero.")).toBeInTheDocument();
    await user.type(screen.getAllByPlaceholderText("0")[0]!, "250");
    await user.type(screen.getByPlaceholderText("e.g. trip, work, gift…"), "trip{Enter}");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.transactions).toEqual([
      expect.objectContaining({ type: "expense", amount: 250, date: "2026-10-15", tags: ["trip"] }),
    ]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("asks what arrived of a transfer into another currency", async () => {
    const { user } = renderWithStore(
      <TransactionSheet target="new" month="2026-10" type="transfer" onClose={vi.fn<() => void>()} />,
      { state },
    );
    await user.type(screen.getAllByPlaceholderText("0")[0]!, "4100");
    expect(screen.getByText("Amount received (USD)")).toBeInTheDocument();
    expect(screen.getByText(/^rate /u)).toBeInTheDocument();
    expect(screen.getByText("Enter what actually arrived in dollars.")).toBeInTheDocument();
  });

  it("splits an entry and keeps the rest in the main category", async () => {
    const { user, probe } = renderWithStore(
      <TransactionSheet target="new" month="2026-10" onClose={vi.fn<() => void>()} />,
      {
        state,
      },
    );
    await user.type(screen.getAllByPlaceholderText("0")[0]!, "1000");
    await user.click(screen.getByRole("button", { name: "Split across categories" }));
    await pick(user, /^Category$/u, /Rent/u);
    await user.type(screen.getAllByRole("textbox", { name: "Amount" }).at(-1)!, "300");
    expect(screen.getByText(/stays in/u)).toHaveTextContent("700 ₴");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.transactions.map((tx) => tx.amount)).toEqual([700, 300]);
  });

  it("offers to remember a merchant's new category", async () => {
    const withCoffee: AppState = { ...state, transactions: [coffee] };
    const { user, probe } = renderWithStore(
      <TransactionSheet target={coffee} month="2026-10" onClose={vi.fn<() => void>()} />,
      {
        state: withCoffee,
      },
    );
    await pick(user, /^Category$/u, /Coffee/u);
    expect(screen.getByRole("switch", { name: /Always file/u })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.rules).toEqual([expect.objectContaining({ categoryId: "cat-coffee" })]);
    expect(probe.undoLabels).toContain("Rule saved");
  });

  it("shows the bank's own words once the note says something else", async () => {
    const renamed: Transaction = { ...coffee, note: "Aroma Kava", bank: { text: "AROMA KAVA 22" } };
    const { user } = renderWithStore(
      <TransactionSheet target={renamed} month="2026-10" onClose={vi.fn<() => void>()} />,
      {
        state: { ...state, transactions: [renamed] },
      },
    );
    expect(screen.getByText("The bank wrote: AROMA KAVA 22")).toBeInTheDocument();
    const note = screen.getByRole("textbox", { name: /^Note/u });
    await user.clear(note);
    await user.type(note, "AROMA KAVA 22");
    expect(screen.queryByText(/The bank wrote/u)).not.toBeInTheDocument();
  });

  it("deletes an entry after asking", async () => {
    const withCoffee: AppState = { ...state, transactions: [coffee] };
    const { user, probe } = renderWithStore(
      <TransactionSheet target={coffee} month="2026-10" onClose={vi.fn<() => void>()} />,
      {
        state: withCoffee,
      },
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    expect(probe.state.transactions).toEqual([]);
    expect(probe.undoLabels).toContain("Transaction deleted");
  });

  it("copies an entry as a new one dated today, without the bank's mark", async () => {
    const withCoffee: AppState = { ...state, transactions: [coffee] };
    const { user, probe } = renderWithStore(
      <TransactionSheet target={coffee} month="2026-10" onClose={vi.fn<() => void>()} />,
      { state: withCoffee },
    );
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.transactions).toHaveLength(2);
    const copy = probe.state.transactions.at(-1);
    expect(copy).toMatchObject({ amount: 120, note: "AROMA KAVA 22", date: "2026-10-15", accountId: "card" });
    expect(copy?.externalId).toBeUndefined();
  });

  it("opens a rule filled in from the entry and links the entry to it", async () => {
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<TransactionSheet target={coffee} month="2026-10" onClose={onClose} />, {
      state: { ...state, transactions: [coffee] },
    });
    await user.click(screen.getByRole("button", { name: "Make recurring" }));
    expect(screen.getByRole("dialog", { name: "New recurring rule" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("120")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Quarterly" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.recurring).toEqual([
      expect.objectContaining({ amount: 120, dayOfMonth: 2, startMonth: "2026-10", period: "quarterly" }),
    ]);
    expect(probe.state.transactions[0]?.recurringId).toBe(probe.state.recurring[0]?.id);
    expect(probe.undoLabels).toContain("Recurring rule added");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("fills an expense from a receipt's QR code like the shop's last one and keeps the photo", async () => {
    scan.readQr.mockResolvedValue(RECEIPT);
    scan.upload.mockResolvedValue({ ids: ["photo1"], failed: false });
    const earlier: Transaction = {
      ...coffee,
      id: "silpo",
      note: "Silpo",
      categoryId: "cat-groceries",
      externalId: undefined,
      receipt: { fn: "3000898168", id: "12" },
    };
    const { user, probe } = renderWithStore(
      <TransactionSheet target="new" month="2026-10" onClose={vi.fn<() => void>()} />,
      {
        state: { ...state, transactions: [earlier] },
      },
    );
    await user.upload(screen.getByLabelText("Scan receipt QR"), new File(["x"], "receipt.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText(/^Filled from the receipt: 780/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.transactions.at(-1)).toMatchObject({
      amount: 780,
      date: "2026-10-14",
      note: "Silpo",
      categoryId: "cat-groceries",
      receipt: { fn: "3000898168", id: "45" },
      attachmentIds: ["photo1"],
    });
  });

  it("says when a receipt is already in the ledger or the photo has no code", async () => {
    scan.readQr.mockResolvedValueOnce(RECEIPT).mockResolvedValueOnce(null);
    const known: Transaction = { ...coffee, id: "known", date: "2026-10-14", receipt: { fn: "3000898168", id: "45" } };
    const { user } = renderWithStore(<TransactionSheet target="new" month="2026-10" onClose={vi.fn<() => void>()} />, {
      state: { ...state, transactions: [known] },
    });
    const input = screen.getByLabelText("Scan receipt QR");
    await user.upload(input, new File(["x"], "a.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText("This receipt is already in the ledger, from 14 Oct 2026.")).toBeInTheDocument();
    await user.upload(input, new File(["y"], "b.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText(/^No receipt QR code in this photo/u)).toBeInTheDocument();
  });
});
