import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AddButton from "./AddButton";

describe("AddButton", () => {
  it("shows a plus and its label and reports a click", async () => {
    const onClick = vi.fn<() => void>();
    const { container } = render(<AddButton label="Add account" onClick={onClick} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add account" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("can be the main action and can be disabled", () => {
    render(<AddButton label="Add" onClick={vi.fn<() => void>()} variant="primary" disabled />);
    const button = screen.getByRole("button", { name: "Add" });
    expect(button.className).toMatch(/primary/u);
    expect(button).toBeDisabled();
  });
});
