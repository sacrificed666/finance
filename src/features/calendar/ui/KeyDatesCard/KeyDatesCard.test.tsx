import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import KeyDatesCard from "./KeyDatesCard";

describe("KeyDatesCard", () => {
  it("shows nothing without key dates", () => {
    const { container } = renderWithI18n(
      <KeyDatesCard month="2026-10" dates={[]} onPick={vi.fn<(date: string) => void>()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("puts each date before what it is and opens its day", async () => {
    const onPick = vi.fn<(date: string) => void>();
    const { user } = renderWithI18n(
      <KeyDatesCard
        month="2026-10"
        dates={[
          { id: "inv:d", date: "2026-10-15", kind: "maturity", icon: "📜", title: "Deposit", subtitle: "Matures" },
        ]}
        onPick={onPick}
      />,
    );
    expect(screen.getByText(/· Matures$/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Deposit/u }));
    expect(onPick).toHaveBeenCalledWith("2026-10-15");
  });
});
