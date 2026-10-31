import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import OptionPicker, { type PickerGroup } from "./OptionPicker";

const GROUPS: PickerGroup[] = [
  { items: [{ value: "", label: "Any account" }] },
  {
    label: "Expense",
    items: [
      { value: "housing", label: "Housing", icon: "🏠", hint: "General" },
      { value: "rent", label: "Rent", icon: "🔑", child: true },
    ],
  },
];

// Nine options, enough for a search field
const MANY: PickerGroup[] = [
  {
    items: Array.from({ length: 9 }, (_, index) => ({ value: `v${String(index)}`, label: `Option ${String(index)}` })),
  },
];

describe("OptionPicker", () => {
  it("names the choice and opens a grouped listbox on the current option", async () => {
    const { user } = renderWithI18n(
      <OptionPicker label="Category" value="rent" onChange={vi.fn<(value: string) => void>()} groups={GROUPS} />,
    );
    await user.click(screen.getByRole("combobox", { name: "Category" }));
    const list = screen.getByRole("listbox", { name: "Category" });
    expect(list).toHaveFocus();
    expect(screen.getByRole("group", { name: "Expense" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Rent/u })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /Rent/u })).toHaveAttribute("data-active", "true");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("shows the placeholder, or the label, without a choice", () => {
    const { rerender } = renderWithI18n(
      <OptionPicker
        label="Account"
        placeholder="Pick one"
        value="none"
        onChange={vi.fn<(value: string) => void>()}
        groups={GROUPS}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Account" })).toHaveTextContent("Pick one");
    rerender(
      <OptionPicker
        label="Account"
        value="none"
        onChange={vi.fn<(value: string) => void>()}
        groups={GROUPS}
        size="sm"
      />,
    );
    expect(screen.getByRole("combobox", { name: "Account" })).toHaveTextContent("Account");
  });

  it("moves with the arrows, Home and End, and picks with Enter or Space", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(<OptionPicker label="Category" value="" onChange={onChange} groups={GROUPS} />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{End}{ArrowUp}{Home}{ArrowUp}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("rent");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowUp" });
    await user.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("picks with a click and closes on Escape or a press outside", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(<OptionPicker label="Category" value="" onChange={onChange} groups={GROUPS} />);
    const button = screen.getByRole("combobox");
    await user.click(button);
    fireEvent.mouseEnter(screen.getByRole("option", { name: /Housing/u }));
    await user.click(screen.getByRole("option", { name: /Housing/u }));
    expect(onChange).toHaveBeenCalledWith("housing");
    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(button);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(button);
    await user.click(button);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("searches long lists and says when nothing matches", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(<OptionPicker label="Option" value="v0" onChange={onChange} groups={MANY} />);
    await user.click(screen.getByRole("combobox"));
    const search = screen.getByRole("textbox", { name: "Search…" });
    expect(search).toHaveFocus();
    await user.type(search, "Option 7");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("v7");
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("textbox"), "zzz");
    expect(screen.getByText("Nothing matches")).toBeInTheDocument();
    await user.keyboard("{ArrowDown} {Enter}");
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
