import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PageBody from "./PageBody";

describe("PageBody", () => {
  it("holds the blocks of a page", () => {
    render(
      <PageBody>
        <section>Hero</section>
        <section>Cards</section>
      </PageBody>,
    );
    expect(screen.getByText("Hero").parentElement?.className).toMatch(/body/u);
    expect(screen.getByText("Cards")).toBeInTheDocument();
  });
});
