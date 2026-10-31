import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import PaletteDialog from "./PaletteDialog";

const push = vi.fn<(href: string) => void>();
let pathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

const STATE: AppState = {
  ...DEFAULT_STATE,
  savings: [
    {
      id: "card",
      name: "Mono Black",
      icon: "💳",
      kind: "card",
      currency: "UAH",
      openingBalance: 4200,
      bank: "monobank",
    },
    { id: "cash", name: "Wallet", icon: "💵", kind: "cash", currency: "UAH", openingBalance: 300 },
  ],
  investments: [
    {
      id: "dep",
      name: "Monobank deposit",
      kind: "deposit",
      currency: "UAH",
      principal: 1000,
      annualRatePct: 14,
      startDate: "2026-01-01",
      compounding: "reinvest",
      compoundingFreq: "monthly",
    },
  ],
  transactions: [
    {
      id: "t1",
      type: "expense",
      amount: 120,
      currency: "UAH",
      categoryId: "cat-groceries",
      date: "2026-09-03",
      note: "Silpo",
    },
    {
      id: "t2",
      type: "expense",
      amount: 80,
      currency: "UAH",
      categoryId: "cat-groceries",
      date: "2099-01-01",
      note: " ",
    },
    { id: "t3", type: "transfer", amount: 50, currency: "UAH", categoryId: "", date: "2026-09-04", tags: ["silpo"] },
    {
      id: "t4",
      type: "income",
      amount: 900,
      currency: "UAH",
      categoryId: "cat-salary",
      date: "2026-09-01",
      note: "Silpo bonus",
    },
    {
      id: "t5",
      type: "expense",
      amount: 65,
      currency: "UAH",
      categoryId: "cat-coffee",
      date: "2026-09-02",
      note: "Aroma Kava",
      bank: { text: "AROMA KAVA 22 KYIV" },
    },
  ],
};

// The palette with its own query and active row
const Palette = ({ onClose }: { onClose: () => void }) => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  return <PaletteDialog query={query} onQuery={setQuery} active={active} onActive={setActive} onClose={onClose} />;
};

describe("PaletteDialog", () => {
  beforeEach(() => {
    push.mockReset();
    pathname = "/";
  });

  it("lists actions and pages, marks the open page and focuses the search", () => {
    renderWithStore(<Palette onClose={vi.fn<() => void>()} />, { state: STATE });
    expect(screen.getByRole("dialog", { name: "Search and commands" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveFocus();
    expect(screen.getByRole("option", { name: /Move money between accounts/u })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Dashboard\s*You are here/u })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Switch to the dark theme/u })).toBeInTheDocument();
  });

  it("finds accounts, positions and entries, past ones first", async () => {
    const { user } = renderWithStore(<Palette onClose={vi.fn<() => void>()} />, { state: STATE });
    await user.type(screen.getByRole("combobox"), "mono");
    expect(screen.getByRole("option", { name: /Mono Black/u })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Monobank deposit/u })).toBeInTheDocument();
    await user.clear(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "silpo");
    const entries = screen.getAllByRole("option").map((option) => option.textContent);
    expect(entries[0]).toMatch(/Transfer/u);
    expect(entries.some((entry) => /Silpo bonus/u.test(entry ?? ""))).toBe(true);
    await user.clear(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "kyiv");
    expect(screen.getByRole("option", { name: /Aroma Kava/u })).toBeInTheDocument();
  });

  it("moves with the arrows and runs a command with Enter", async () => {
    const onClose = vi.fn<() => void>();
    const { user } = renderWithStore(<Palette onClose={onClose} />, { state: STATE });
    await user.type(screen.getByRole("combobox"), "repo");
    await user.keyboard("{ArrowDown}{ArrowUp}{Enter}");
    expect(onClose).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/reports");
  });

  it("opens a sheet on the current page and flips the theme", async () => {
    pathname = "/income";
    const { user, probe } = renderWithStore(<Palette onClose={vi.fn<() => void>()} />, { state: STATE });
    await user.click(screen.getByRole("option", { name: /Add income/u }));
    expect(push).toHaveBeenCalledWith("/income?add=income");
    await user.click(screen.getByRole("option", { name: /Switch to the dark theme/u }));
    expect(probe.state.settings.theme).toBe("dark");
  });

  it("says when nothing matches and closes on Escape or a click on the dim", async () => {
    const onClose = vi.fn<() => void>();
    const { user } = renderWithStore(<Palette onClose={onClose} />, { state: STATE });
    await user.type(screen.getByRole("combobox"), "zzzz");
    expect(screen.getByText("Nothing matches “zzzz”")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("follows the pointer over the results", () => {
    renderWithStore(<Palette onClose={vi.fn<() => void>()} />, { state: STATE });
    const option = screen.getByRole("option", { name: /Calendar/u });
    fireEvent.mouseMove(option);
    expect(option).toHaveAttribute("aria-selected", "true");
  });
});
