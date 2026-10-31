import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Badge from "./Badge";

describe("Badge", () => {
  it("is neutral by default", () => {
    render(<Badge>Planned</Badge>);
    expect(screen.getByText("Planned").className).toMatch(/neutral/u);
  });

  it("takes a tone", () => {
    render(<Badge tone="expense">Over budget</Badge>);
    expect(screen.getByText("Over budget").className).toMatch(/expense/u);
  });
});
