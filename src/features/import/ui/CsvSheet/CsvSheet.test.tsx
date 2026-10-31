import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CsvDraft } from "@/features/import/model/csv";
import type { ImportCandidate } from "@/features/import/model/import";
import { renderWithStore } from "@/test/render";

import CsvSheet from "./CsvSheet";

const draft: CsvDraft = {
  name: "statement.csv",
  header: ["Date", "Amount", "Details"],
  rows: [["2026-10-01", "-100", "Silpo"]],
  mapping: {
    date: 0,
    amount: 1,
    description: 2,
    debit: -1,
    mcc: -1,
    category: -1,
    account: -1,
    currency: -1,
    type: -1,
    payee: -1,
  },
};

describe("CsvSheet", () => {
  it("previews the rows once the date and amount columns are known", async () => {
    const onPreview = vi.fn<(found: ImportCandidate[]) => void>();
    const { user } = renderWithStore(
      <CsvSheet
        draft={draft}
        onChange={vi.fn<(next: CsvDraft) => void>()}
        onClose={vi.fn<() => void>()}
        onPreview={onPreview}
      />,
    );
    expect(screen.getByText(/statement\.csv/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /1/u }));
    expect(onPreview).toHaveBeenCalledWith([expect.objectContaining({ description: "Silpo", amount: 100 })]);
  });

  it("asks for the date and amount columns", () => {
    renderWithStore(
      <CsvSheet
        draft={{ ...draft, mapping: { ...draft.mapping, date: -1 } }}
        onChange={vi.fn<(next: CsvDraft) => void>()}
        onClose={vi.fn<() => void>()}
        onPreview={vi.fn<(found: ImportCandidate[]) => void>()}
      />,
    );
    expect(screen.getAllByRole("button").some((button) => button.hasAttribute("disabled"))).toBe(true);
  });
});
