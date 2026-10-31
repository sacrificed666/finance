import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import PeriodTabs from "./PeriodTabs";

describe("PeriodTabs", () => {
  it("offers the chart periods and reports months as a number", async () => {
    const onChange = vi.fn<(value: number) => void>();
    const { user } = renderWithI18n(<PeriodTabs value={12} onChange={onChange} />);
    expect(screen.getByRole("group", { name: "Period" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "1Y" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "6M" }));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("takes its own periods", () => {
    renderWithI18n(
      <PeriodTabs value={1} onChange={vi.fn<(value: number) => void>()} options={[{ months: 1, label: "30 d" }]} />,
    );
    expect(screen.getByRole("radio", { name: "30 d" })).toBeInTheDocument();
  });
});
