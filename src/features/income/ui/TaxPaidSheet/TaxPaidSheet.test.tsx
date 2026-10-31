import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { profileFromRegime } from "@/features/income/model/tax";
import { taxObligations } from "@/features/income/model/taxCalendar";
import { renderWithStore } from "@/test/render";

import TaxPaidSheet from "./TaxPaidSheet";

const state: AppState = { ...DEFAULT_STATE, settings: { ...DEFAULT_STATE.settings, tax: profileFromRegime("fop3") } };
const esv = taxObligations(state, 2026).find((item) => item.id === "2026-Q3:esv")!;
const earlier = taxObligations(state, 2026).find((item) => item.id === "2026-Q2:esv")!;

describe("TaxPaidSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("will not take a day still to come", () => {
    renderWithStore(<TaxPaidSheet obligations={[esv]} onClose={() => null} />, { state });
    expect(screen.getByText(/Social contribution/u)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Paid on"), { target: { value: "2026-10-20" } });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByText("Pick the day you paid: today or earlier.")).toBeInTheDocument();
  });

  it("pays each of several on a day of its own and leaves one out", async () => {
    const { user, probe } = renderWithStore(
      <TaxPaidSheet obligations={[earlier, esv]} label="Q2 and Q3" onClose={() => null} />,
      { state },
    );
    const [first, second] = screen.getAllByLabelText("Paid on");
    fireEvent.change(first!, { target: { value: "2026-07-18" } });
    fireEvent.change(second!, { target: { value: "2026-10-02" } });
    await user.click(screen.getAllByRole("switch")[1]!);
    expect(screen.getAllByLabelText("Paid on")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.settings.taxPaid).toEqual({ "2026-Q2:esv": "2026-07-18" });
  });

  it("can still book an expense when the tax was taken off income", async () => {
    const onClose = vi.fn<() => void>();
    const taxed: AppState = {
      ...state,
      transactions: [
        {
          id: "pay",
          type: "income",
          amount: 9000,
          currency: "UAH",
          categoryId: "cat-salary",
          date: "2026-08-05",
          tax: { ratePct: 6, fixedUAH: 0, gross: 10_000, regime: "fop3" },
        },
      ],
    };
    const { user, probe } = renderWithStore(<TaxPaidSheet obligations={[esv]} onClose={onClose} />, { state: taxed });
    const book = screen.getByRole("switch", { name: "Record as an expense" });
    expect(book).not.toBeChecked();
    expect(screen.getByText(/count it twice/u)).toBeInTheDocument();
    await user.click(book);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.transactions.filter((tx) => tx.type === "expense")).toHaveLength(1);
    expect(onClose).toHaveBeenCalled();
  });
});
