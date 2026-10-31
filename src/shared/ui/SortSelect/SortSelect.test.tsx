import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { chooseValue } from "@/test/choose";
import { renderWithI18n } from "@/test/render";

import SortSelect from "./SortSelect";

const OPTIONS = [
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
];

describe("SortSelect", () => {
  it("changes what the list is sorted by", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(
      <SortSelect
        value="date"
        onChange={onChange}
        options={OPTIONS}
        direction="desc"
        onDirectionChange={vi.fn<(direction: string) => void>()}
      />,
    );
    await chooseValue(user, screen.getByRole("combobox", { name: "Sort by" }), "amount");
    expect(onChange).toHaveBeenCalledWith("amount");
  });

  it("flips the direction both ways", async () => {
    const onDirectionChange = vi.fn<(direction: string) => void>();
    const { user, rerender } = renderWithI18n(
      <SortSelect
        value="date"
        onChange={vi.fn<(value: string) => void>()}
        options={OPTIONS}
        direction="desc"
        onDirectionChange={onDirectionChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Descending" }));
    expect(onDirectionChange).toHaveBeenLastCalledWith("asc");
    rerender(
      <SortSelect
        value="date"
        onChange={vi.fn<(value: string) => void>()}
        options={OPTIONS}
        direction="asc"
        onDirectionChange={onDirectionChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Ascending" }));
    expect(onDirectionChange).toHaveBeenLastCalledWith("desc");
  });
});
