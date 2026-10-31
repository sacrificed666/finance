import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { cachedQuotes } from "@/features/investments/api/inzhurSite";
import { INZHUR_FUNDS } from "@/features/investments/model/inzhur";
import { failure } from "@/shared/api/http";

export const dynamic = "force-dynamic";

// The Inzhur fund quotes, all of them or the ids asked for
export const GET = async (request: Request) => {
  if (!(await currentUserId())) return failure("Sign in first.", 401);
  const cache = await cachedQuotes(Date.now());
  if (!cache) return failure("Could not reach Inzhur, try again in a minute.", 503);
  const wanted = new URL(request.url).searchParams.get("ids");
  const filter = wanted
    ? new Set(
        wanted
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      )
    : null;
  const all = [...cache.quotes.values()];
  return NextResponse.json({
    quotes: filter ? all.filter((quote) => filter.has(quote.id)) : all,
    fetchedAt: new Date(cache.fetchedAt).toISOString(),
    partial: all.length < INZHUR_FUNDS.length,
  });
};
