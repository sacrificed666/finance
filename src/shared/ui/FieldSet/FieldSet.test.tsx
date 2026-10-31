import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FieldSet from "./FieldSet";

describe("FieldSet", () => {
  it("puts a label and a hint around a group of controls", () => {
    render(
      <FieldSet label="Theme" hint="Follows the account">
        <div role="radiogroup" aria-label="Theme" />
      </FieldSet>,
    );
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByText("Follows the account")).toBeInTheDocument();
  });

  it("leaves the hint out when there is none", () => {
    const { container } = render(
      <FieldSet label="Currency">
        <div />
      </FieldSet>,
    );
    expect(container.querySelectorAll("span")).toHaveLength(1);
  });
});
