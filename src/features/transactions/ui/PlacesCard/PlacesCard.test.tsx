import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { Transaction } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import PlacesCard from "./PlacesCard";

// An expense with a note in October
const spend = (id: string, note: string, amount: number): Transaction => ({
  id,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId: "cat-food",
  date: "2026-10-05",
  note,
});

describe("PlacesCard", () => {
  it("lists the costliest places with how often money went there", () => {
    const state = {
      ...DEFAULT_STATE,
      transactions: [spend("a", "Silpo", 300), spend("b", "Silpo", 200), spend("c", "Uklon", 90)],
    };
    renderWithStore(<PlacesCard month="2026-10" />, { state });
    expect(screen.getByRole("heading", { name: "Top places" })).toBeInTheDocument();
    expect(screen.getByText("2 times")).toBeInTheDocument();
    expect(screen.getByText("1 time")).toBeInTheDocument();
  });

  it("stays away with fewer than two places", () => {
    const state = { ...DEFAULT_STATE, transactions: [spend("a", "Silpo", 300)] };
    const { container } = renderWithStore(<PlacesCard month="2026-10" />, { state });
    expect(container).toBeEmptyDOMElement();
  });
});
