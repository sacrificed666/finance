import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PageHeader from "./PageHeader";

describe("PageHeader", () => {
  it("names the page in its only top-level heading", () => {
    render(<PageHeader title="Accounts" subtitle="Where the money is" action={<button type="button">Add</button>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
    expect(screen.getByText("Where the money is")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("leaves the subtitle out when there is none", () => {
    const { container } = render(<PageHeader title="Reports" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});
