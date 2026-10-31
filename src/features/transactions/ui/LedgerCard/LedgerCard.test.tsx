import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { useLedgerView } from "@/features/transactions/model/useLedgerView";
import type { downloadFile } from "@/shared/lib/download";
import { chooseValue } from "@/test/choose";
import { renderWithStore } from "@/test/render";

import LedgerCard from "./LedgerCard";

const download = vi.hoisted(() => vi.fn<typeof downloadFile>());

vi.mock(import("@/shared/lib/download"), async (importOriginal) => ({
  ...(await importOriginal()),
  downloadFile: download,
}));

// The card for October with its own view, opening entries with the given spy
const Ledger = ({ onEdit, review = false }: { onEdit: (tx: Transaction) => void; review?: boolean }) => {
  const view = useLedgerView("", review);
  return <LedgerCard month="2026-10" view={view} onAdd={vi.fn<() => void>()} onEdit={onEdit} />;
};

// The card for October with spies for its callbacks
const card = () => <Ledger onEdit={vi.fn<(tx: Transaction) => void>()} />;

// The texts of the entry rows, top to bottom
const names = () => screen.getAllByRole("button", { name: /₴/u }).map((button) => button.textContent ?? "");

// An entry with the given fields
const entry = (over: Partial<Transaction> & Pick<Transaction, "id" | "date">): Transaction => ({
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-groceries",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 }],
  transactions: [
    entry({ id: "milk", date: "2026-10-02", amount: 85, note: "Milk", tags: ["home"] }),
    entry({ id: "coffee", date: "2026-10-02", amount: 120, categoryId: "cat-coffee", accountId: "card" }),
    entry({ id: "salary", date: "2026-10-05", type: "income", amount: 40000, categoryId: "cat-salary" }),
    entry({ id: "rent", date: "2026-10-25", amount: 12000, categoryId: "cat-rent", attachmentIds: ["a1"] }),
  ],
};

describe("LedgerCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
    localStorage.setItem("finance:view:ledger.kind", JSON.stringify("all"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the month by day, newest first, with the net of days with several entries and the planned marked", () => {
    renderWithStore(card(), { state });
    expect(screen.getByText("4 entries in October 2026")).toBeInTheDocument();
    const days = screen.getAllByRole("heading", { level: 3 });
    expect(days.map((day) => day.textContent)).toEqual([
      expect.stringContaining("planned"),
      expect.not.stringContaining("₴"),
      expect.stringContaining("−205\u00A0₴"),
    ]);
    expect(screen.getByRole("button", { name: /Receipt/u })).toBeInTheDocument();
  });

  it("shows the expenses until another kind is chosen, and keeps the choice", async () => {
    localStorage.clear();
    const { user } = renderWithStore(card(), { state });
    expect(screen.getByText("3 entries in October 2026")).toBeInTheDocument();
    expect(names().some((name) => name.includes("40,000"))).toBe(false);
    await user.click(screen.getByRole("radio", { name: "In" }));
    expect(names()).toEqual([expect.stringMatching(/40,000/u)]);
    expect(localStorage.getItem("finance:view:ledger.kind")).toBe(JSON.stringify("income"));
    await user.type(screen.getByPlaceholderText("Search notes, categories, accounts…"), "milk");
    expect(screen.getByText("Nothing in October 2026 matches these filters.")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Reset filters" }).at(-1)!);
    expect(names()).toHaveLength(4);
  });

  it("finds entries by their note and resets the search", async () => {
    const { user } = renderWithStore(card(), { state });
    await user.type(screen.getByPlaceholderText("Search notes, categories, accounts…"), "milk");
    expect(screen.getByText("1 match in October 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByText("4 entries in October 2026")).toBeInTheDocument();
  });

  it("keeps a search under a name and brings it back in one tap", async () => {
    const { user, probe } = renderWithStore(card(), { state });
    await user.type(screen.getByPlaceholderText("Search notes, categories, accounts…"), "milk");
    await user.click(screen.getByRole("button", { name: "Save view" }));
    await user.type(screen.getByRole("textbox", { name: "View name" }), "Dairy");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.settings.ledgerViews).toEqual([expect.objectContaining({ name: "Dairy", query: "milk" })]);
    expect(screen.getByRole("button", { name: "Dairy" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Dairy" }));
    expect(screen.getByRole("button", { name: "Dairy" })).toHaveAttribute("aria-pressed", "false");
  });

  it("lists the bank's entries to review and confirms them all", async () => {
    const withBank: AppState = {
      ...state,
      transactions: [
        ...state.transactions,
        entry({ id: "bank", date: "2026-10-08", note: "SILPO 12", unreviewed: true }),
      ],
    };
    const { user, probe } = renderWithStore(card(), { state: withBank });
    await user.click(screen.getByRole("button", { name: /To review/u }));
    expect(screen.getByText(/^1 match/u)).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm 1 entry" }));
    expect(probe.state.transactions.find((tx) => tx.id === "bank")).not.toHaveProperty("unreviewed");
    expect(probe.undoLabels).toContain("1 entry confirmed");
  });

  it("opens the review queue from a link with every month in it, and leaves it for a period", async () => {
    const withBank: AppState = {
      ...state,
      transactions: [...state.transactions, entry({ id: "late", date: "2026-09-30", note: "WOG 7", unreviewed: true })],
    };
    const { user } = renderWithStore(<Ledger onEdit={vi.fn<(tx: Transaction) => void>()} review />, {
      state: withBank,
    });
    expect(names()).toEqual([expect.stringContaining("WOG 7")]);
    await user.click(screen.getAllByRole("radio", { name: "Oct" })[0]!);
    expect(screen.getByRole("button", { name: /To review/u })).toHaveAttribute("aria-pressed", "false");
    expect(names()).not.toContainEqual(expect.stringContaining("WOG 7"));
  });

  it("opens an entry to edit it", async () => {
    const onEdit = vi.fn<(tx: Transaction) => void>();
    const { user } = renderWithStore(<Ledger onEdit={onEdit} />, {
      state,
    });
    await user.click(screen.getByRole("button", { name: /^Milk/u }));
    expect(onEdit).toHaveBeenCalledWith(state.transactions[0]);
  });

  it("deletes the picked entries after asking", async () => {
    const { user, probe } = renderWithStore(card(), {
      state,
    });
    await user.click(screen.getByRole("button", { name: "Select" }));
    await user.click(screen.getByRole("button", { name: /^Milk/u }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(probe.state.transactions.map((tx) => tx.id)).toEqual(["coffee", "salary", "rent"]);
    expect(probe.undoLabels).toContain("1 entry deleted");
  });

  it("invites to log the first entry", () => {
    renderWithStore(card());
    expect(screen.getByText("No transactions this month")).toBeInTheDocument();
  });

  it("sorts by amount, category or account and flips the order", async () => {
    const { user } = renderWithStore(card(), { state });
    const sortBy = screen.getByRole("combobox", { name: "Sort by" });
    await chooseValue(user, sortBy, "amount");
    expect(names()[0]).toMatch(/40/u);
    await user.click(screen.getByRole("button", { name: "Descending" }));
    expect(names()[0]).toMatch(/Milk/u);
    await chooseValue(user, sortBy, "category");
    await chooseValue(user, sortBy, "account");
    expect(names().at(-1)).toMatch(/120/u);
  });

  it("folds the category, account, tag and timing filters away, counting those on", async () => {
    const { user } = renderWithStore(card(), { state });
    const more = screen.getByRole("button", { name: "Filters" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("radio", { name: "Planned" })).not.toBeInTheDocument();
    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("radio", { name: "Planned" }));
    expect(names()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Filters 1" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(names()).toHaveLength(4);
    vi.setSystemTime(Date.now() + 1000);
    await user.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.queryByRole("radio", { name: "Planned" })).not.toBeInTheDocument();
  });

  it("searches every month and says when nothing matches", async () => {
    const { user } = renderWithStore(card(), { state });
    await user.click(screen.getByRole("radio", { name: "All time" }));
    await user.type(screen.getByPlaceholderText("Search notes, categories, accounts…"), "card");
    expect(screen.getByText("1 match across every month")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Search notes, categories, accounts…"), "zzz");
    expect(screen.getByText("Nothing in the whole ledger matches that.")).toBeInTheDocument();
  });

  it("downloads the shown entries as CSV", async () => {
    const { user } = renderWithStore(card(), { state });
    await user.click(screen.getByRole("button", { name: /CSV/u }));
    expect(download).toHaveBeenCalledWith(
      expect.stringMatching(/\.csv$/u),
      expect.stringContaining("Milk"),
      "text/csv;charset=utf-8",
    );
  });

  it("files, tags and picks all entries at once", async () => {
    const { user, probe } = renderWithStore(card(), { state });
    await user.click(screen.getByRole("button", { name: "Select" }));
    await user.click(screen.getByRole("button", { name: "Select all 4" }));
    expect(screen.getByText("4 selected")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Add tag" }), "trip");
    await user.click(screen.getByRole("button", { name: "Add tag" }));
    expect(probe.state.transactions.every((tx) => tx.tags?.includes("trip"))).toBe(true);
    await user.click(screen.getByRole("combobox", { name: /^Set category/u }));
    await user.click(screen.getByRole("option", { name: /Coffee/u }));
    expect(probe.state.transactions.filter((tx) => tx.categoryId === "cat-coffee")).toHaveLength(3);
    expect(probe.undoLabels).toEqual(expect.arrayContaining(["#trip added to 4 entries"]));
    vi.setSystemTime(Date.now() + 500);
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Milk/u }));
    await user.click(screen.getByRole("button", { name: /^Milk/u }));
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    vi.setSystemTime(Date.now() + 500);
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByText("0 selected")).not.toBeInTheDocument();
  });

  it("marks an entry left out of reports", () => {
    renderWithStore(card(), {
      state: { ...state, transactions: [entry({ id: "trip", date: "2026-10-03", note: "Trip", excluded: true })] },
    });
    expect(names()).toEqual([expect.stringContaining("Left out")]);
  });

  it("does not repeat a category that the note only restates", () => {
    renderWithStore(card(), {
      state: {
        ...state,
        transactions: [
          entry({ id: "rent", date: "2026-10-01", note: "Rent", categoryId: "cat-rent", accountId: "card" }),
        ],
      },
    });
    expect(names()).toEqual([expect.stringMatching(/^🔑RentHousing · Card/u)]);
  });
});
