import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import SearchInput from "./SearchInput";

describe("SearchInput", () => {
  it("is named by its placeholder and reports typing", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(<SearchInput value="" onChange={onChange} placeholder="Search entries" />);
    const input = screen.getByRole("searchbox", { name: "Search entries" });
    await user.type(input, "r");
    expect(onChange).toHaveBeenCalledWith("r");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("uses the general label and clears what was typed", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(<SearchInput value="rent" onChange={onChange} className="extra" />);
    expect(screen.getByRole("searchbox", { name: "Search…" })).toHaveValue("rent");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
