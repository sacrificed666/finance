import { NextResponse } from "next/server";

import { auth } from "@/features/auth/model/auth";
import { isOwnerEmail } from "@/features/auth/model/authConfig";
import { logError } from "@/features/settings/api/errorLog";
import { clearErrors, recentErrors } from "@/features/settings/api/errorStore";
import { failure, jsonBody, notSignedIn } from "@/shared/api/http";
import { readString, readText } from "@/shared/lib/guards";
import { rateLimit } from "@/shared/lib/rateLimit";

export const dynamic = "force-dynamic";

// Turns away everyone but the signed-in owner, or null for the owner
const refusal = async (): Promise<NextResponse | null> => {
  const session = await auth();
  if (!session?.user?.id) return notSignedIn();
  return isOwnerEmail(session.user.email) ? null : failure("Only the owner sees server problems.", 403);
};

// The latest server errors for the owner; any other account has none to see
export const GET = async () => {
  const refused = await refusal();
  if (refused?.status === 403) return NextResponse.json({ errors: [], total: 0 });
  return refused ?? NextResponse.json(await recentErrors());
};

// Forgets the server errors
export const DELETE = async () => {
  const refused = await refusal();
  if (refused) return refused;
  await clearErrors();
  return NextResponse.json({ ok: true });
};

// A page of the app by its path alone, never its query
const PAGE_RE = /^\/[\w./-]{0,120}$/u;

// Keeps a page that failed in a signed-in browser, for the owner's server problems
export const POST = async (request: Request) => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return notSignedIn();
  if (!rateLimit(`client-error:${id}`, 10, 10 * 60_000).allowed) return failure("Too many reports.", 429);
  const body = await jsonBody(request);
  const page = readText(body, "page") ?? "";
  const message = readString(body, "message");
  if (!PAGE_RE.test(page) || !message) return failure("Expected { page, message }", 400);
  await logError(`browser ${page}`, message.slice(0, 500), readString(body, "digest")?.slice(0, 64));
  return NextResponse.json({ ok: true });
};
