import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import LanguagePicker from "./LanguagePicker";

describe("LanguagePicker", () => {
  it("names the current language and lists every language with its flag", async () => {
    const { user } = renderWithI18n(<LanguagePicker value="uk" onChange={vi.fn<(value: string) => void>()} />);
    const button = screen.getByRole("button", { name: "Language: Українська" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    const list = screen.getByRole("listbox", { name: "Language" });
    expect(list).toHaveFocus();
    expect(screen.getAllByRole("option")).toHaveLength(10);
    expect(screen.getByRole("option", { name: "Українська" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /Deutsch\s*German/u })).toBeInTheDocument();
    expect(screen.getByText("Deutsch")).toHaveAttribute("lang", "de");
    expect(document.querySelector("img[src='/flags/UA']")).toBeInTheDocument();
  });

  it("picks a language with a click and closes", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(<LanguagePicker value="en" onChange={onChange} compact />);
    await user.click(screen.getByRole("button", { name: "Language: English" }));
    await user.click(screen.getByRole("option", { name: /Polski/u }));
    expect(onChange).toHaveBeenCalledWith("pl");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveFocus();
  });

  it("moves through the list with the keyboard", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(<LanguagePicker value="en" onChange={onChange} />);
    const button = screen.getByRole("button", { name: "Language: English" });
    fireEvent.keyDown(button, { key: "ArrowDown" });
    const list = screen.getByRole("listbox");
    expect(list.getAttribute("aria-activedescendant")).toMatch(/-en$/u);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(list.getAttribute("aria-activedescendant")).toMatch(/-cs$/u);
    await user.keyboard("{ArrowUp}");
    expect(list.getAttribute("aria-activedescendant")).toMatch(/-uk$/u);
    await user.keyboard("{End}");
    expect(list.getAttribute("aria-activedescendant")).toMatch(/-pt$/u);
    await user.keyboard("{ArrowDown}");
    expect(list.getAttribute("aria-activedescendant")).toMatch(/-en$/u);
    await user.keyboard("{ArrowUp}{Home}{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("uk");
  });

  it("keeps the value when the current language is chosen again", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(<LanguagePicker value="en" onChange={onChange} />);
    await user.click(screen.getByRole("button"));
    await user.keyboard(" ");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes on Escape, on Tab and on a click outside", async () => {
    const { user } = renderWithI18n(<LanguagePicker value="en" onChange={vi.fn<(value: string) => void>()} />);
    const button = screen.getByRole("button");
    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    await user.click(button);
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Tab" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(button);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(button);
    await user.click(button);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ignores other keys in the list and lets the pointer move the active option", async () => {
    const { user } = renderWithI18n(<LanguagePicker value="en" onChange={vi.fn<(value: string) => void>()} />);
    await user.click(screen.getByRole("button"));
    const list = screen.getByRole("listbox");
    fireEvent.keyDown(list, { key: "a" });
    fireEvent.mouseEnter(screen.getByRole("option", { name: /Italiano/u }));
    expect(list.getAttribute("aria-activedescendant")).toMatch(/-it$/u);
  });
});
