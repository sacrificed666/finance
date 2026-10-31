import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("asks before deleting and confirms with the red button", async () => {
    const onConfirm = vi.fn<() => void>();
    const onClose = vi.fn<() => void>();
    const { user } = renderWithI18n(
      <ConfirmDialog open title="Delete account?" message="Entries stay." onConfirm={onConfirm} onClose={onClose} />,
    );
    expect(screen.getByRole("dialog", { name: "Delete account?" })).toHaveTextContent("Entries stay.");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("takes its own confirm label and cancels without confirming", async () => {
    const onConfirm = vi.fn<() => void>();
    const onClose = vi.fn<() => void>();
    const { user } = renderWithI18n(
      <ConfirmDialog open title="Stop?" message="" confirmLabel="Stop" onConfirm={onConfirm} onClose={onClose} />,
    );
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders nothing while closed", () => {
    renderWithI18n(
      <ConfirmDialog
        open={false}
        title="Hidden"
        message=""
        onConfirm={vi.fn<() => void>()}
        onClose={vi.fn<() => void>()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
