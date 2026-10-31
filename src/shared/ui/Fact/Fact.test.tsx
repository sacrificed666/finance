import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Fact from "./Fact";

describe("Fact", () => {
  it("pairs a label with its value", () => {
    render(
      <dl>
        <Fact label="Balance">5,200.00 ₴</Fact>
      </dl>,
    );
    expect(screen.getByRole("term")).toHaveTextContent("Balance");
    expect(screen.getByRole("definition")).toHaveTextContent("5,200.00 ₴");
  });

  it("can take the whole row", () => {
    const { container } = render(
      <dl>
        <Fact label="Note" wide>
          Long text
        </Fact>
      </dl>,
    );
    expect(container.querySelector("dl > div")?.className).toMatch(/wide/u);
  });
});
