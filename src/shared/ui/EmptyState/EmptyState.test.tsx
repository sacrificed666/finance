import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("explains the empty list and offers the first step", () => {
    render(
      <EmptyState
        icon="🎯"
        title="No goals yet"
        hint="A goal shows how close you are"
        action={<button type="button">Add a goal</button>}
      />,
    );
    expect(screen.getByText("No goals yet")).toBeInTheDocument();
    expect(screen.getByText("A goal shows how close you are")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a goal" })).toBeInTheDocument();
    expect(screen.getByText("🎯")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows only the title when there is nothing else", () => {
    const { container } = render(<EmptyState icon="📭" title="Nothing here" />);
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
