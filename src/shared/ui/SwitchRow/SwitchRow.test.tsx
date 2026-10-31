import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SwitchRow from "./SwitchRow";

describe("SwitchRow", () => {
  it("names its switch after the title and shows the hint", async () => {
    const onChange = vi.fn<(checked: boolean) => void>();
    render(<SwitchRow title="Roll over" hint="Leftovers move on" checked={false} onChange={onChange} />);
    expect(screen.getByText("Leftovers move on")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: "Roll over" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
