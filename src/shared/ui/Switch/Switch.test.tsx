import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Switch from "./Switch";

describe("Switch", () => {
  it("shows its state and flips it on a click", async () => {
    const onChange = vi.fn<(checked: boolean) => void>();
    render(<Switch label="Budgets" checked={false} onChange={onChange} />);
    const toggle = screen.getByRole("switch", { name: "Budgets" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("turns off when it is on", async () => {
    const onChange = vi.fn<(checked: boolean) => void>();
    render(<Switch label="Budgets" checked onChange={onChange} />);
    const toggle = screen.getByRole("switch", { name: "Budgets" });
    expect(toggle.className).toMatch(/on/u);
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
