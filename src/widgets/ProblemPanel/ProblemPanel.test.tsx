import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ProblemPanel from "./ProblemPanel";

describe("ProblemPanel", () => {
  it("names the problem, explains it and offers a way on", () => {
    render(
      <ProblemPanel
        icon="warning"
        title="Broke"
        body="Try again"
        detail="TypeError"
        actions={<button type="button">Retry</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Broke" })).toBeInTheDocument();
    expect(screen.getByText("TypeError")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
