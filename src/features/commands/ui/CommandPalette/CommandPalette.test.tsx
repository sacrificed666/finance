import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { openCommandPalette } from "@/features/commands/model/palette";
import { renderWithStore } from "@/test/render";

import CommandPalette from "./CommandPalette";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn<(href: string) => void>() }),
  usePathname: () => "/",
}));

describe("CommandPalette", () => {
  it("opens and closes with Ctrl+K and Cmd+K", () => {
    renderWithStore(<CommandPalette />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "K", metaKey: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true, altKey: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens empty from a palette button and closes on Escape", async () => {
    const { user } = renderWithStore(<CommandPalette />);
    act(() => openCommandPalette());
    await user.type(screen.getByRole("combobox"), "rep");
    await user.keyboard("{Escape}");
    act(() => openCommandPalette());
    expect(screen.getByRole("combobox")).toHaveValue("");
  });
});
