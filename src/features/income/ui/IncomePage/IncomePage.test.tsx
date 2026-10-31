import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { renderWithStore } from "@/test/render";

import IncomePage from "./IncomePage";

describe("IncomePage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the headline and the list, the months and sources once there is income", () => {
    renderWithStore(<IncomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Income" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All income" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Income by month" })).not.toBeInTheDocument();
  });

  it("charts the months and the sources of the income there is", () => {
    renderWithStore(<IncomePage />, {
      state: {
        ...DEFAULT_STATE,
        transactions: [
          { id: "pay", type: "income", amount: 1000, currency: "UAH", categoryId: "cat-salary", date: "2026-10-05" },
        ],
      },
    });
    for (const card of ["Income by month", "All income", "By source"]) {
      expect(screen.getByRole("heading", { name: card })).toBeInTheDocument();
    }
  });

  it("opens an empty income from the header", async () => {
    const { user } = renderWithStore(<IncomePage />);
    await user.click(screen.getAllByRole("button", { name: "Add income" })[0]!);
    expect(screen.getByRole("dialog", { name: "New income" })).toBeInTheDocument();
  });
});
