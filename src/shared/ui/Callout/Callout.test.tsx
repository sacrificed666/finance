import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Callout from "./Callout";

describe("Callout", () => {
  it("is a note with a title and a body by default", () => {
    render(
      <Callout title="Tip" className="extra">
        Rates refresh every hour
      </Callout>,
    );
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("Tip");
    expect(note).toHaveTextContent("Rates refresh every hour");
    expect(note).toHaveClass("extra");
  });

  it("announces warnings and dangers as alerts", () => {
    const { rerender } = render(<Callout tone="warning" title="Over budget" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Over budget");
    rerender(<Callout tone="danger">Could not save</Callout>);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  });

  it("leaves out the parts it is not given", () => {
    render(<Callout tone="success" />);
    expect(screen.getByRole("note").querySelectorAll("p")).toHaveLength(0);
  });
});
