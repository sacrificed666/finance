import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { PlannedEvent } from "@/features/data/model/types";
import { forecast } from "@/features/forecast/model/forecast";
import { renderWithI18n } from "@/test/render";

import EventsCard from "./EventsCard";

const car: PlannedEvent = { id: "car", month: "2027-03", amount: -9000, currency: "UAH", note: "Car" };

const f = forecast(DEFAULT_STATE, "2026-10-10", {
  years: 2,
  returnPct: 0,
  spreadPct: 0,
  inflationOn: false,
  withDebts: false,
  withSaving: false,
  view: "UAH",
  events: [],
});

describe("EventsCard", () => {
  it("adds a sum going out from its sheet and keeps the note", async () => {
    const onChange = vi.fn<(events: PlannedEvent[], undoLabel?: string) => void>();
    const { user } = renderWithI18n(<EventsCard f={f} events={[]} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Add" }));
    const sheet = screen.getByRole("dialog", { name: "New event" });
    const save = within(sheet).getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    await user.type(within(sheet).getByRole("textbox", { name: "Amount" }), "1200");
    await user.type(within(sheet).getByRole("textbox", { name: "Note" }), "Tuition");
    await user.click(save);
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ amount: -1200, note: "Tuition", month: "2027-04" }),
    ]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists the events, changes one and deletes it with an undo", async () => {
    const onChange = vi.fn<(events: PlannedEvent[], undoLabel?: string) => void>();
    const { user } = renderWithI18n(<EventsCard f={f} events={[car]} onChange={onChange} />);
    expect(screen.getByText("−9,000 ₴")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Car/u }));
    const sheet = screen.getByRole("dialog", { name: "Edit event" });
    await user.click(within(sheet).getByRole("radio", { name: "Income" }));
    await user.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(onChange).toHaveBeenLastCalledWith([{ ...car, amount: 9000 }]);
    await user.click(screen.getByRole("button", { name: /^Car/u }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(onChange).toHaveBeenLastCalledWith([], "Event deleted");
  });
});
