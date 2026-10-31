import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SavingsAccount } from "@/features/data/model/types";

import AccountMark from "./AccountMark";

// An account with the given fields
const account = (over: Partial<SavingsAccount>): SavingsAccount => ({
  id: "a",
  name: "Account",
  icon: "💳",
  kind: "card",
  currency: "UAH",
  openingBalance: 0,
  ...over,
});

describe("AccountMark", () => {
  it("shows the emoji of a plain account", () => {
    render(<AccountMark account={account({})} />);
    expect(screen.getByText("💳")).toBeInTheDocument();
  });

  it("shows a bank's logo with its name", () => {
    render(<AccountMark account={account({ bank: "monobank" })} />);
    expect(screen.getByRole("img", { name: "Monobank" })).toHaveAttribute("src", "/brands/monobank.png");
  });

  it("shows a coin's picture for a crypto wallet", () => {
    const wallet = account({ kind: "crypto", holdings: [{ coin: "bitcoin", quantity: 1, icon: "btc.png" }] });
    const { container } = render(<AccountMark account={wallet} />);
    expect(container.querySelector("img")).toHaveAttribute("src", "btc.png");
  });
});
