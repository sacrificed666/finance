import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SegmentedControl, { type SegmentOption } from "./SegmentedControl";

const OPTIONS: SegmentOption<string>[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

describe("SegmentedControl", () => {
  it("is a named group of native radios with one checked", () => {
    render(
      <SegmentedControl label="Theme" options={OPTIONS} value="light" onChange={vi.fn<(value: string) => void>()} />,
    );
    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Auto" })).not.toBeChecked();
  });

  it("slides the thumb under the chosen segment", () => {
    const { container } = render(
      <SegmentedControl
        options={OPTIONS}
        value="dark"
        onChange={vi.fn<(value: string) => void>()}
        size="sm"
        className="extra"
      />,
    );
    expect(container.querySelector<HTMLElement>("span[aria-hidden]")?.style.left).toContain("0.666");
    expect(container.firstElementChild).toHaveClass("extra");
  });

  it("reports clicks and arrow keys", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const user = userEvent.setup();
    render(<SegmentedControl label="Theme" options={OPTIONS} value="system" onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(onChange).toHaveBeenLastCalledWith("dark");
    screen.getByRole("radio", { name: "Auto" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("light");
  });

  it("puts the thumb under the first segment when the value is unknown", () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="other" onChange={vi.fn<(value: string) => void>()} />,
    );
    expect(container.querySelector<HTMLElement>("span[aria-hidden]")?.style.left).toContain("0 *");
  });
});
