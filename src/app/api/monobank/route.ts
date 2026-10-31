import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { connectMono, deleteMono, loadMono, MonoError, publicMono } from "@/features/import/api/monobank";
import { logError } from "@/features/settings/api/errorLog";
import { failure, jsonBody, notSignedIn } from "@/shared/api/http";
import { readString } from "@/shared/lib/guards";

export const dynamic = "force-dynamic";

// The answer to a failed bank call; unexpected ones are logged
const monoFailure = (error: unknown) => {
  if (error instanceof MonoError) return failure(error.message, error.status);
  void logError("api/monobank", error);
  return failure("unreachable", 502);
};

// The account's Monobank connection without its token
export const GET = async () => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  return NextResponse.json(publicMono(await loadMono(id)));
};

// Connects with a new token, or refreshes the cards with the stored one
export const POST = async (request: Request) => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  const token = readString(await jsonBody(request), "token") ?? (await loadMono(id))?.token;
  if (!token || !/^[\w-]{20,100}$/u.test(token)) return failure("token", 400);
  try {
    return NextResponse.json(publicMono(await connectMono(id, token)));
  } catch (error) {
    return monoFailure(error);
  }
};

// Disconnects Monobank
export const DELETE = async () => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  await deleteMono(id);
  return NextResponse.json({ ok: true });
};
