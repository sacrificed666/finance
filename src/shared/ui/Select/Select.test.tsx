import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { chooseValue } from "@/test/choose";

import Select from "./Select";

describe("Select", () => {
  it("lists its options in the app's own dropdown and hands on the choice", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: string) => void>();
    render(
      <Select aria-label="Currency" defaultValue="UAH" onChange={(event) => onChange(event.target.value)} size="sm">
        <option value="UAH">₴</option>
        <optgroup label="Foreign">
          <option value="USD">$</option>
        </optgroup>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Currency" });
    await chooseValue(user, select, "USD");
    expect(onChange).toHaveBeenCalledWith("USD");
    expect(select).toHaveTextContent("$");
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("group", { name: "Foreign" })).toBeInTheDocument();
  });

  it("takes an option's words for its value and stays shut while turned off", () => {
    render(
      <Select aria-label="Year" disabled value="2026">
        {"text"}
        <option>2026</option>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Year" })).toBeDisabled();
  });
});
