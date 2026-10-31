import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import Sheet from "./Sheet";

describe("Sheet", () => {
  it("is a modal dialog named by its title that locks the page", () => {
    renderWithI18n(
      <Sheet open onClose={vi.fn<() => void>()} title="New entry" footer={<button type="button">Save</button>}>
        <input aria-label="Amount" />
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog", { name: "New entry" });
    expect(dialog).toHaveAttribute("open");
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("closes with the close button, Escape and a click on the dim", async () => {
    const onClose = vi.fn<() => void>();
    const { user } = renderWithI18n(
      <Sheet open onClose={onClose} title="Details">
        <p>Body</p>
      </Sheet>,
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.keyboard("{Escape}");
    fireEvent.mouseDown(screen.getByRole("dialog"));
    fireEvent.mouseDown(screen.getByText("Body"));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("submits once as a form and keeps the dim from closing it", async () => {
    const onSubmit = vi.fn<() => void>();
    const onClose = vi.fn<() => void>();
    const now = vi.spyOn(Date, "now").mockReturnValue(10_000);
    renderWithI18n(
      <Sheet
        open
        onClose={onClose}
        onSubmit={onSubmit}
        title="Edit"
        problem="Fill in the amount"
        footer={<button type="submit">Save</button>}
      >
        <input aria-label="Amount" />
      </Sheet>,
    );
    expect(screen.getByText("Fill in the amount")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledOnce();
    now.mockReturnValue(10_500);
    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledTimes(2);
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes only the topmost of two open dialogs on Escape", async () => {
    const outer = vi.fn<() => void>();
    const inner = vi.fn<() => void>();
    const { user } = renderWithI18n(
      <>
        <Sheet open onClose={outer} title="Outer">
          <p>Outer body</p>
        </Sheet>
        <Sheet open onClose={inner} title="Inner" wide>
          <p>Inner body</p>
        </Sheet>
      </>,
    );
    await user.keyboard("{Escape}");
    expect(inner).toHaveBeenCalledOnce();
    expect(outer).not.toHaveBeenCalled();
  });

  it("empties and closes while closed and gives the page its scroll back", () => {
    const { rerender } = renderWithI18n(
      <Sheet open onClose={vi.fn<() => void>()} title="Open">
        <p>Body</p>
      </Sheet>,
    );
    rerender(
      <Sheet open={false} onClose={vi.fn<() => void>()} title="Open">
        <p>Body</p>
      </Sheet>,
    );
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
    expect(document.body.style.overflow).toBe("");
  });
});
