import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

import { parseFiscalQr, receiptEntry, shopEntry } from "./fiscalReceipt";

const LINK = "https://cabinet.tax.gov.ua/cashregs/check?mac=001A&date=20260904&time=1130&id=45&sm=780.00&fn=3000898168";

// An entry scanned from a receipt of the test register
const entry = (id: string, date: string, receiptId: string): Transaction => ({
  id,
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-groceries",
  date,
  note: "Silpo",
  receipt: { fn: "3000898168", id: receiptId },
});

describe("fiscal receipts", () => {
  it("reads the sum, day, time and numbers of a receipt's QR code", () => {
    expect(parseFiscalQr(LINK)).toEqual({ fn: "3000898168", id: "45", amount: 780, date: "2026-09-04", time: "11:30" });
    expect(parseFiscalQr(` ${LINK.replace("sm=780.00", "sm=12,5")} `)?.amount).toBe(12.5);
  });

  it("leaves out other codes, other sites and broken receipts", () => {
    expect(parseFiscalQr("hello")).toBeNull();
    expect(parseFiscalQr(LINK.replace("cabinet.tax.gov.ua", "example.com"))).toBeNull();
    expect(parseFiscalQr(LINK.replace("date=20260904", "date=20260231"))).toBeNull();
    expect(parseFiscalQr(LINK.replace("sm=780.00", "sm=0"))).toBeNull();
    expect(parseFiscalQr(LINK.replace("fn=3000898168", "fn=abc"))).toBeNull();
  });

  it("finds an entry made from the same receipt and the latest one from the same register", () => {
    const receipt = parseFiscalQr(LINK)!;
    const state: AppState = {
      ...DEFAULT_STATE,
      transactions: [entry("a", "2026-08-01", "7"), entry("b", "2026-08-20", "9")],
    };
    expect(receiptEntry(state, receipt)).toBeUndefined();
    expect(shopEntry(state, receipt)?.id).toBe("b");
    expect(receiptEntry({ ...state, transactions: [entry("c", "2026-09-04", "45")] }, receipt)?.id).toBe("c");
  });
});
