import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Money from "./Money";

describe("Money", () => {
  it("formats the amount with its currency", () => {
    render(<Money amount={1234.5} currency="UAH" exact className="extra" />);
    const money = screen.getByText("1,234.50 ₴");
    expect(money).toHaveClass("extra");
  });

  it("can be short and signed", () => {
    render(<Money amount={47_100} currency="USD" compact sign />);
    expect(screen.getByText("+$47.1K")).toBeInTheDocument();
  });
});
