import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HeroHeading from "./HeroHeading";

describe("HeroHeading", () => {
  it("shows the title and the summary", () => {
    render(<HeroHeading title="Last 12 months" summary="+280.3K ₴" />);
    expect(screen.getByText("Last 12 months")).toBeInTheDocument();
    expect(screen.getByText("+280.3K ₴")).toBeInTheDocument();
  });

  it("shows only the title without a summary", () => {
    const { container } = render(<HeroHeading title="Made of" />);
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});
