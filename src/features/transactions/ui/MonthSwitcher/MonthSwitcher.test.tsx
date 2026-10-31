import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import MonthSwitcher from "./MonthSwitcher";

describe("MonthSwitcher", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-17T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks this month and steps to the neighbours", async () => {
    const onChange = vi.fn<(month: string) => void>();
    const { user } = renderWithI18n(<MonthSwitcher month="2026-10" onChange={onChange} />);
    expect(screen.getByText("this month")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(onChange.mock.calls).toEqual([["2026-09"], ["2026-11"]]);
  });

  it("returns to this month and stops where plans end", async () => {
    const onChange = vi.fn<(month: string) => void>();
    const { user } = renderWithI18n(<MonthSwitcher month="2027-09" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenCalledWith("2026-10");
  });
});
