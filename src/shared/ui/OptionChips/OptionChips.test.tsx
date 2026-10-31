import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import OptionChips from "./OptionChips";

const ICONS = [
  { value: "🏠", label: "🏠", title: "House" },
  { value: "🚗", label: "🚗" },
];

describe("OptionChips", () => {
  it("names each chip by its title, or its label", () => {
    render(
      <OptionChips label="Icon" options={ICONS} value="🏠" onChange={vi.fn<(value: string) => void>()} size="lg" />,
    );
    expect(screen.getByRole("group", { name: "Icon" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "House" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "🚗" })).not.toBeChecked();
  });

  it("reports the chip the user picks", async () => {
    const onChange = vi.fn<(value: string) => void>();
    render(<OptionChips label="Icon" options={ICONS} value="🏠" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "🚗" }));
    expect(onChange).toHaveBeenCalledWith("🚗");
  });
});
