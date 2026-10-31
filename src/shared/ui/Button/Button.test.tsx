import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Button from "./Button";

describe("Button", () => {
  it("is a plain button by default and takes a variant and a size", () => {
    render(
      <Button variant="danger" size="sm" className="extra">
        Delete
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveAttribute("type", "button");
    expect(button.className).toMatch(/danger/u);
    expect(button.className).toMatch(/sm/u);
    expect(button).toHaveClass("extra");
  });

  it("submits a form when asked to", () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
  });

  it("ignores a second click that follows too closely", async () => {
    const now = vi.spyOn(Date, "now");
    const onClick = vi.fn<() => void>();
    render(<Button onClick={onClick}>Add</Button>);
    const button = screen.getByRole("button", { name: "Add" });
    now.mockReturnValue(10_000);
    await userEvent.click(button);
    now.mockReturnValue(10_200);
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    now.mockReturnValue(10_500);
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("does nothing while disabled", async () => {
    const onClick = vi.fn<() => void>();
    render(
      <Button onClick={onClick} disabled>
        Add
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
