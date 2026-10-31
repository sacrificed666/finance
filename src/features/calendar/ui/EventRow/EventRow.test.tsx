import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DayEvent } from "@/features/calendar/model/monthEvents";

import EventRow from "./EventRow";

const lunch: DayEvent = {
  id: "lunch",
  date: "2026-10-10",
  kind: "expense",
  title: "Lunch",
  subtitle: "Food",
  icon: "🍝",
  amount: 250,
  currency: "UAH",
};

describe("EventRow", () => {
  it("shows a spending with a minus and opens it", async () => {
    const onOpen = vi.fn<() => void>();
    render(
      <ul>
        <EventRow event={lunch} onOpen={onOpen} />
      </ul>,
    );
    expect(screen.getByText("−250 ₴")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Lunch/u }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("shows a deadline without a sign and without a button", () => {
    render(
      <ul>
        <EventRow event={{ ...lunch, kind: "tax", title: "Single tax" }} />
      </ul>,
    );
    expect(screen.getByText("250 ₴")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
