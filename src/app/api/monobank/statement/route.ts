import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import {
  loadMono,
  MONO_MAX_RANGE_S,
  monoStatement,
  MonoError,
  recordMonoBalance,
} from "@/features/import/api/monobank";
import { logError } from "@/features/settings/api/errorLog";
import { failure, notSignedIn } from "@/shared/api/http";

export const dynamic = "force-dynamic";

// The statement of a connected card or jar for up to 31 days
export const GET = async (request: Request) => {
  const userId = await currentUserId();
  if (!userId) return notSignedIn();
  const stored = await loadMono(userId);
  if (!stored) return failure("not-connected", 409);

  const url = new URL(request.url);
  const account = url.searchParams.get("account") ?? "";
  const from = Number(url.searchParams.get("from"));
  const to = Number(url.searchParams.get("to"));
  if (!stored.accounts?.some((entry) => entry.id === account)) return failure("account", 400);
  if (!Number.isInteger(from) || !Number.isInteger(to) || to <= from || to - from > MONO_MAX_RANGE_S) {
    return failure("range", 400);
  }
  try {
    const items = await monoStatement(userId, stored.token, account, from, to);
    await recordMonoBalance(userId, account, items);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof MonoError) return failure(error.message, error.status);
    await logError("api/monobank/statement", error);
    return failure("unreachable", 502);
  }
};
