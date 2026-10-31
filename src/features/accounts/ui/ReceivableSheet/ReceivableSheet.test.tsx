import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Receivable } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import ReceivableSheet from "./ReceivableSheet";

const loan: Receivable = {
  id: "r",
  name: "Olena",
  icon: "🤝",
  amount: 5000,
  currency: "UAH",
  date: "2026-09-01",
  repaid: 1000,
};

describe("ReceivableSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records money lent today", async () => {
    const { user, probe } = renderWithStore(
      <ReceivableSheet target="new" onClose={vi.fn<() => void>()} onDelete={vi.fn<(id: string) => void>()} />,
    );
    await user.type(screen.getByRole("textbox", { name: /^Who owes you/u }), "Taras");
    await user.type(screen.getByRole("textbox", { name: /^Amount lent/u }), "2000");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.receivables).toEqual([
      expect.objectContaining({ name: "Taras", amount: 2000, date: "2026-10-10" }),
    ]);
  });

  it("marks a loan fully repaid", async () => {
    const { user } = renderWithStore(
      <ReceivableSheet target={loan} onClose={vi.fn<() => void>()} onDelete={vi.fn<(id: string) => void>()} />,
    );
    await user.click(screen.getByRole("button", { name: "Mark as fully repaid" }));
    expect(screen.getAllByDisplayValue("5000")).toHaveLength(2);
  });
});
