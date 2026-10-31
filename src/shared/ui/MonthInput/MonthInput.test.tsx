import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { chooseValue } from "@/test/choose";
import { renderWithI18n } from "@/test/render";

import MonthInput from "./MonthInput";

describe("MonthInput", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the chosen month and year and changes either", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(<MonthInput name="Start" value="2026-03" onChange={onChange} />);
    const month = screen.getByRole("combobox", { name: "Start: month" });
    const year = screen.getByRole("combobox", { name: "Start: year" });
    expect(month).toHaveTextContent("March");
    expect(year).toHaveTextContent("2026");
    await chooseValue(user, month, "7");
    expect(onChange).toHaveBeenLastCalledWith("2026-07");
    await chooseValue(user, year, "2030");
    expect(onChange).toHaveBeenLastCalledWith("2030-03");
  });

  it("offers five years back and ten ahead, and keeps an older chosen year", async () => {
    const { user } = renderWithI18n(
      <MonthInput name="Start" value="2015-01" onChange={vi.fn<(value: string) => void>()} />,
    );
    await user.click(screen.getByRole("combobox", { name: "Start: year" }));
    const years = screen.getAllByRole("option").map((option) => option.textContent);
    expect(years).toContain("2015");
    expect(years).toContain("2036");
    expect(years).not.toContain("2037");
  });

  it("can be emptied when the month is optional", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(<MonthInput name="End" value="" onChange={onChange} allowEmpty />);
    const month = screen.getByRole("combobox", { name: "End: month" });
    expect(month).toHaveTextContent("-");
    await chooseValue(user, month, "5");
    expect(onChange).toHaveBeenLastCalledWith("2026-05");
    await chooseValue(user, screen.getByRole("combobox", { name: "End: year" }), "0");
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("starts at the current month when a required value is missing", () => {
    renderWithI18n(<MonthInput name="Start" value="" onChange={vi.fn<(value: string) => void>()} />);
    expect(screen.getByRole("combobox", { name: "Start: month" })).toHaveTextContent("September");
    expect(screen.getByRole("combobox", { name: "Start: year" })).toHaveTextContent("2026");
  });
});
