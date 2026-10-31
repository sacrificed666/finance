import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_DASHBOARD } from "@/features/dashboard/model/layout";
import type { DashboardCardId, DashboardLayout } from "@/features/data/model/types";
import { renderWithI18n } from "@/test/render";

import LayoutSheet from "./LayoutSheet";

// The sheet over a layout, with spies for its callbacks
const renderSheet = (layout: DashboardLayout, retired?: DashboardCardId[]) => {
  const onChange = vi.fn<(next: DashboardLayout) => void>();
  const onClose = vi.fn<() => void>();
  return {
    onChange,
    onClose,
    ...renderWithI18n(<LayoutSheet layout={layout} retired={retired} onChange={onChange} onClose={onClose} />),
  };
};

describe("LayoutSheet", () => {
  it("moves a card down its column and keeps the first one from moving up", async () => {
    const { user, onChange } = renderSheet(DEFAULT_DASHBOARD);
    expect(screen.getByRole("button", { name: "Move First steps up" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move Quick add down" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ main: ["start", "cashFlow", "quickAdd", "spending", "cashAhead"] }),
    );
  });

  it("leaves a retired card out, so the first one left cannot move up", async () => {
    const { user, onChange } = renderSheet(DEFAULT_DASHBOARD, ["start"]);
    expect(screen.queryByText("First steps")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move Quick add up" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move Quick add down" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ main: ["cashFlow", "quickAdd", "spending", "cashAhead"] }),
    );
  });

  it("hides a card and resets a changed layout", async () => {
    const { user, onChange } = renderSheet({ ...DEFAULT_DASHBOARD, hidden: ["progress"] });
    await user.click(screen.getByRole("switch", { name: "Show Allocation" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ hidden: ["progress", "holdings"] }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_DASHBOARD);
  });
});
