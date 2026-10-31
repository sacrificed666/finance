import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "@/test/render";

import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  it("names a plan that waits, ended or paused", () => {
    renderWithI18n(
      <>
        <StatusBadge status="upcoming" />
        <StatusBadge status="ended" />
        <StatusBadge status="paused" />
      </>,
    );
    expect(screen.getByText("upcoming")).toBeInTheDocument();
    expect(screen.getByText("ended")).toBeInTheDocument();
    expect(screen.getByText("paused")).toBeInTheDocument();
  });

  it("shows nothing for a running one", () => {
    const { container } = renderWithI18n(
      <>
        <StatusBadge status="now" />
        <StatusBadge status="active" />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
