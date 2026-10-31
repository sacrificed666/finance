import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { feedPath } from "@/features/calendar/api/feedToken";
import { failure, notSignedIn } from "@/shared/api/http";

export const dynamic = "force-dynamic";

// The path of the account's calendar file for a link number the browser keeps
export const GET = async (request: Request) => {
  const userId = await currentUserId();
  if (!userId) return notSignedIn();
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) return failure("Calendar links need AUTH_SECRET on the server.", 503);
  const feed = Number(new URL(request.url).searchParams.get("feed"));
  if (!Number.isInteger(feed) || feed < 1) return failure("Pass feed as a positive whole number.", 400);
  return NextResponse.json({ path: feedPath(secret, userId, feed) });
};
