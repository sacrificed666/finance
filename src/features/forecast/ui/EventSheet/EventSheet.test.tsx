import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { blankEventDraft, type EventDraft } from "@/features/forecast/model/events";
import { renderWithI18n } from "@/test/render";

import EventSheet from "./EventSheet";

describe("EventSheet", () => {
  it("offers the currencies in use and saves a sum coming in", async () => {
    const onSave = vi.fn<(draft: EventDraft) => void>();
    const { user } = renderWithI18n(
      <EventSheet
        target="new"
        initial={blankEventDraft("2026-10", "UAH")}
        currencies={["UAH", "USD"]}
        onSave={onSave}
        onDelete={vi.fn<() => void>()}
        onClose={vi.fn<() => void>()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Income" }));
    await user.click(screen.getByRole("radio", { name: "USD" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "300");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ sign: "in", currency: "USD", amount: "300" }));
  });
});
