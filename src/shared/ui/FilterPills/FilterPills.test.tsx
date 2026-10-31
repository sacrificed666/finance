import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import FilterPills from "./FilterPills";

describe("FilterPills", () => {
  it("shows each filter with its count and reports a choice", async () => {
    const onChange = vi.fn<(value: string) => void>();
    render(
      <FilterPills
        label="Type"
        value="all"
        onChange={onChange}
        options={[
          { value: "all", label: "All", count: 12 },
          { value: "out", label: "Out" },
        ]}
      />,
    );
    expect(screen.getByRole("group", { name: "Type" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^All\s*12$/u })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Out" }));
    expect(onChange).toHaveBeenCalledWith("out");
  });
});
