import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Fact from "../Fact/Fact";
import Facts from "./Facts";

describe("Facts", () => {
  it("lists terms with their values", () => {
    const { container } = render(
      <Facts className="extra">
        <Fact label="Rate">14.5%</Fact>
        <Fact label="Ends" wide>
          1 March 2027
        </Fact>
      </Facts>,
    );
    expect(screen.getAllByRole("term")).toHaveLength(2);
    expect(screen.getAllByRole("definition")).toHaveLength(2);
    expect(screen.getByText("14.5%")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("extra");
  });
});
