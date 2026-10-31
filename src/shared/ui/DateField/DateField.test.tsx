import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import DateField from "./DateField";

describe("DateField", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-28T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("takes a date typed in numbers once it is a real day and shows it in the page's order", () => {
    const onChange = vi.fn<(value: string) => void>();
    renderWithI18n(<DateField aria-label="Date" value="2026-10-01" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Date" });
    expect(input).toHaveValue("01/10/2026");
    fireEvent.change(input, { target: { value: "05/10/20" } });
    expect(onChange).toHaveBeenLastCalledWith("2020-10-05");
    fireEvent.change(input, { target: { value: "05/10/202" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.blur(input);
    expect(input).toHaveValue("01/10/2026");
  });

  it("picks a day from the month, steps between months and keeps to the bounds", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(
      <DateField aria-label="Date" value="2026-10-01" max="2026-10-28" onChange={onChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Pick a date" }));
    expect(screen.getByRole("dialog", { name: "October 2026" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^29 Oct 2026/u })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^1 Oct 2026/u })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: /^15 Sept 2026/u }));
    expect(onChange).toHaveBeenLastCalledWith("2026-09-15");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pick a date" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("dialog", { name: "November 2026" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-10-28");
  });

  it("can be emptied when the date is optional, and closes on Escape or a press outside", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(<DateField aria-label="Due" allowEmpty value="2026-11-02" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Due" }), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith("");
    await user.click(screen.getByRole("button", { name: "Pick a date" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenLastCalledWith("");
    await user.click(screen.getByRole("button", { name: "Pick a date" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pick a date" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
