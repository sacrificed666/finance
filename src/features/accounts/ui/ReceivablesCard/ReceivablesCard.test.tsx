import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Receivable } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import ReceivablesCard from "./ReceivablesCard";

// Money lent with the given fields
const lent = (over: Partial<Receivable> & Pick<Receivable, "id" | "name">): Receivable => ({
  icon: "🤝",
  amount: 1000,
  currency: "UAH",
  date: "2026-09-01",
  repaid: 0,
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  receivables: [
    lent({ id: "back", name: "Paid back", repaid: 1000 }),
    lent({ id: "late", name: "Late", dueDate: "2026-10-01", repaid: 400 }),
    lent({ id: "soon", name: "Soon", dueDate: "2026-11-01" }),
  ],
};

describe("ReceivablesCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the open loans by due date, the late one marked, the settled one last", () => {
    renderWithStore(
      <ReceivablesCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(receivable: Receivable) => void>()} />,
      { state },
    );
    expect(screen.getByText("1 overdue")).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows).toEqual([
      expect.stringContaining("Late"),
      expect.stringContaining("Soon"),
      expect.stringContaining("Paid back"),
    ]);
    expect(screen.getByText(/^overdue since/u).className).toMatch(/late/u);
  });

  it("leaves the total to the subtitle for a single loan", () => {
    renderWithStore(
      <ReceivablesCard onAdd={vi.fn<() => void>()} onEdit={vi.fn<(receivable: Receivable) => void>()} />,
      { state: { ...state, receivables: state.receivables.slice(1, 2) } },
    );
    expect(screen.getByText("Late")).toBeInTheDocument();
    expect(screen.queryByText("1 overdue")).not.toBeInTheDocument();
  });
});
