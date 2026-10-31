import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FormRow from "./FormRow";

describe("FormRow", () => {
  it("lays its fields out evenly or with one wider", () => {
    const { container, rerender } = render(
      <FormRow>
        <span />
        <span />
      </FormRow>,
    );
    expect(container.firstElementChild?.className).toMatch(/row/u);
    rerender(
      <FormRow wide="last">
        <span />
      </FormRow>,
    );
    expect(container.firstElementChild?.className).toMatch(/last/u);
    rerender(
      <FormRow wide="first">
        <span />
      </FormRow>,
    );
    expect(container.firstElementChild?.className).toMatch(/first/u);
  });
});
