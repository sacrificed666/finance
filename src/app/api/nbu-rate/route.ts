import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { dayRate, kyivDay, kyivMonth, monthAverages, type NbuCurrency } from "@/features/market/api/nbuBank";
import { failure, notSignedIn } from "@/shared/api/http";

export const dynamic = "force-dynamic";

// Whether a value is a currency the NBU rates are read for
const isNbuCurrency = (value: string): value is NbuCurrency => value === "USD" || value === "EUR";

// The averages of an ended month
const forMonth = async (month: string) => {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/u.test(month) || month >= kyivMonth()) {
    return failure("Pass a month that has ended, as YYYY-MM.", 400);
  }
  const rates = await monthAverages(month).catch(() => null);
  return rates ? NextResponse.json(rates) : failure("NBU did not answer.", 502);
};

// The NBU rate of a currency on a day, or the averages of a month
export const GET = async (request: Request) => {
  if (!(await currentUserId())) return notSignedIn();
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  if (month !== null) return forMonth(month);
  const currency = url.searchParams.get("currency") ?? "";
  const date = url.searchParams.get("date") ?? "";
  if (!isNbuCurrency(currency) || !/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    return failure("Pass currency=USD|EUR and date=YYYY-MM-DD, or month=YYYY-MM.", 400);
  }
  if (date > kyivDay()) {
    return failure("The NBU sets a rate only for days that have come.", 404);
  }
  const rate = await dayRate(currency, date).catch(() => null);
  return rate === null ? failure("NBU did not answer.", 502) : NextResponse.json({ rate });
};
