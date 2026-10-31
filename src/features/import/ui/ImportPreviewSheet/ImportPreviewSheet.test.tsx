import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ImportCandidate } from "@/features/import/model/import";
import { renderWithStore } from "@/test/render";

import ImportPreviewSheet from "./ImportPreviewSheet";

// An operation found with the given fields
const candidate = (externalId: string, over: Partial<ImportCandidate>): ImportCandidate => ({
  externalId,
  date: "2026-10-01",
  type: "expense",
  amount: 100,
  currency: "UAH",
  description: externalId,
  categoryId: "cat-groceries",
  duplicate: false,
  ...over,
});

describe("ImportPreviewSheet", () => {
  it("ticks all the new operations and imports the picked ones", async () => {
    const onToggle = vi.fn<(ids: string[], on: boolean) => void>();
    const onImport = vi.fn<() => void>();
    const { user } = renderWithStore(
      <ImportPreviewSheet
        title="Monobank"
        candidates={[candidate("Silpo", {}), candidate("Again", { duplicate: true })]}
        selected={new Set(["Silpo"])}
        onChange={vi.fn<(id: string, categoryId: string) => void>()}
        onToggle={onToggle}
        onImport={onImport}
        onClose={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByText(/1 already/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Select none" }));
    expect(onToggle).toHaveBeenCalledWith(["Silpo"], false);
    await user.click(screen.getByRole("checkbox", { name: "Again" }));
    expect(onToggle).toHaveBeenLastCalledWith(["Again"], true);
    await user.click(screen.getByRole("button", { name: /^Add 1/u }));
    expect(onImport).toHaveBeenCalledOnce();
  });
});
