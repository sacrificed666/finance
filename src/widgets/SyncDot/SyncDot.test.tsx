import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "@/test/render";

import SyncDot from "./SyncDot";

describe("SyncDot", () => {
  it("says a change is saving", () => {
    renderWithI18n(<SyncDot sync="saving" />);
    const pill = screen.getByText("Saving");
    expect(pill.className).toMatch(/saving/u);
    expect(pill).toHaveAttribute("title");
  });

  it("says a change could not be saved", () => {
    renderWithI18n(<SyncDot sync="error" />);
    expect(screen.getByText("Not saved").className).toMatch(/failed/u);
  });

  it("shows nothing once everything is saved", () => {
    const { container } = renderWithI18n(<SyncDot sync="idle" />);
    expect(container.firstChild).toBeNull();
  });
});
