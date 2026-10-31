import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import EntryIntents from "./EntryIntents";

const replace = vi.fn<(href: string, options?: unknown) => void>();
let search = "";

vi.mock("next/navigation", () => ({
  usePathname: () => "/income",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    { id: "coffee", type: "expense", amount: 90, currency: "UAH", categoryId: "cat-coffee", date: "2026-10-02" },
    {
      id: "pay",
      type: "income",
      amount: 940,
      currency: "UAH",
      categoryId: "cat-salary",
      date: "2026-10-05",
      tax: { ratePct: 6, fixedUAH: 0, gross: 1000 },
    },
  ],
};

describe("EntryIntents", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  afterEach(() => {
    search = "";
  });

  it("opens a new entry of the asked kind and clears the request on close", async () => {
    search = "add=income&from=home";
    const { user } = renderWithStore(<EntryIntents />, { state });
    expect(await screen.findByRole("dialog", { name: "New transaction" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Income" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(replace).toHaveBeenCalledWith("/income?from=home", { scroll: false });
  });

  it("opens an entry by its id", async () => {
    search = "tx=coffee";
    renderWithStore(<EntryIntents />, { state });
    expect(await screen.findByRole("dialog", { name: "Edit transaction" })).toBeInTheDocument();
  });

  it("opens an income with its tax in the income sheet that keeps it", async () => {
    search = "tx=pay";
    renderWithStore(<EntryIntents />, { state });
    expect(await screen.findByRole("dialog", { name: "Edit income" })).toBeInTheDocument();
  });

  it("stays closed without a request or for an unknown entry", () => {
    search = "tx=nothing";
    const { container } = renderWithStore(<EntryIntents />, { state });
    expect(container).toBeEmptyDOMElement();
  });
});
