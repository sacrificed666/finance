import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import NameField from "./NameField";

describe("NameField", () => {
  it("names a thing and picks its emoji from the disc before the name", async () => {
    const user = userEvent.setup();
    const onName = vi.fn<(value: string) => void>();
    const onIcon = vi.fn<(icon: string) => void>();
    render(
      <NameField
        label="Name"
        value=""
        onChange={onName}
        icon={{ value: "🎁", options: ["🎁", "🚗"], onChange: onIcon, label: "Icon" }}
      />,
    );
    await user.type(screen.getByRole("textbox", { name: "Name" }), "a");
    expect(onName).toHaveBeenCalledWith("a");
    await user.click(screen.getByRole("button", { name: "Icon" }));
    await user.click(screen.getByRole("radio", { name: "🚗" }));
    expect(onIcon).toHaveBeenCalledWith("🚗");
    expect(screen.queryByRole("radio", { name: "🚗" })).not.toBeInTheDocument();
  });

  it("is a plain name without an icon", () => {
    render(<NameField label="Name" value="Car" onChange={vi.fn<(value: string) => void>()} hint="Say what" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Say what")).toBeInTheDocument();
  });
});
