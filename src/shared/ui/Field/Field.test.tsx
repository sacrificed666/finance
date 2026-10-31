import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Field from "./Field";

describe("Field", () => {
  it("names the control it wraps and shows a hint", () => {
    render(
      <Field label="Amount" hint="In the account's currency">
        <input />
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: /^Amount/u })).toBeInTheDocument();
    expect(screen.getByText("In the account's currency")).toBeInTheDocument();
  });

  it("leaves the hint out when there is none", () => {
    const { container } = render(
      <Field label="Note">
        <input />
      </Field>,
    );
    expect(container.querySelectorAll("span")).toHaveLength(1);
  });
});
