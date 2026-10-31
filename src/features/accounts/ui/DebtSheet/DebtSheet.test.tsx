import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithStore } from "@/test/render";

import DebtSheet from "./DebtSheet";

describe("DebtSheet", () => {
  it("adds a loan with its rate", async () => {
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(
      <DebtSheet target="new" onClose={onClose} onDelete={vi.fn<(id: string) => void>()} />,
    );
    await user.type(screen.getByPlaceholderText("e.g. Apartment mortgage"), "Car");
    await user.click(screen.getByRole("radio", { name: "Loan" }));
    await user.type(screen.getByRole("textbox", { name: /^Outstanding balance/u }), "150000");
    await user.type(screen.getByPlaceholderText("e.g. 12.5"), "14");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.debts).toEqual([
      expect.objectContaining({ name: "Car", kind: "loan", balance: 150000, annualRatePct: 14 }),
    ]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("asks for a name first", () => {
    renderWithStore(<DebtSheet target="new" onClose={vi.fn<() => void>()} onDelete={vi.fn<(id: string) => void>()} />);
    expect(screen.getByText("Name the debt.")).toBeInTheDocument();
  });
});
