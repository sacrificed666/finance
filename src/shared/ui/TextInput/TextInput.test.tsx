import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import TextInput from "./TextInput";

describe("TextInput", () => {
  it("is a plain text field that reports typing", async () => {
    const onChange = vi.fn<() => void>();
    render(<TextInput aria-label="Note" onChange={onChange} size="sm" className="extra" />);
    const input = screen.getByRole("textbox", { name: "Note" });
    expect(input.className).toMatch(/sm/u);
    expect(input).toHaveClass("extra");
    await userEvent.type(input, "Rent");
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it("shows a prefix inside the field, hidden from screen readers", () => {
    render(<TextInput aria-label="Amount" prefix="₴" />);
    const prefix = screen.getByText("₴");
    expect(prefix).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("textbox", { name: "Amount" }).className).toMatch(/prefixed/u);
  });
});
