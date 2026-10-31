import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Unit from "./Unit";

describe("Unit", () => {
  it("shows the unit beside a figure", () => {
    render(
      <p>
        498 ₴<Unit>/mo</Unit>
      </p>,
    );
    expect(screen.getByText("/mo").tagName).toBe("SPAN");
  });
});
