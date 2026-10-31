import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";

import {
  deleteReceivable,
  initialReceivableForm,
  receivableProblem,
  saveReceivable,
  type ReceivableForm,
} from "./receivableForm";

// A filled form of money lent to a friend
const lent = (over: Partial<ReceivableForm> = {}): ReceivableForm => ({
  ...initialReceivableForm("new", "2026-10-10"),
  name: "Olena",
  amount: "5000",
  ...over,
});

describe("receivableProblem", () => {
  it("checks the name, the amount, the repaid part and the date", () => {
    expect(receivableProblem(lent())).toBeNull();
    expect(receivableProblem(lent({ name: "" }))).toBe("receivables.problem.name");
    expect(receivableProblem(lent({ amount: "0" }))).toBe("receivables.problem.amount");
    expect(receivableProblem(lent({ repaid: "6000" }))).toBe("receivables.problem.repaid");
    expect(receivableProblem(lent({ date: "" }))).toBe("receivables.problem.date");
  });
});

describe("saving", () => {
  it("adds a loan dated today and deletes it", () => {
    const saved = saveReceivable(DEFAULT_STATE, lent({ repaid: "" }), () => "r1");
    expect(saved.receivables).toEqual([
      expect.objectContaining({ id: "r1", amount: 5000, repaid: 0, date: "2026-10-10" }),
    ]);
    expect(deleteReceivable(saved, "r1").receivables).toEqual([]);
  });
});
