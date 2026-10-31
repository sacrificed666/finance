import { NextResponse } from "next/server";

import { passwordHashOf, setPasswordHash } from "@/features/auth/model/accounts";
import { currentSession } from "@/features/auth/model/currentUser";
import { hashPassword, passwordProblem, verifyPassword } from "@/features/auth/model/password";
import { endOtherSessions } from "@/features/auth/model/sessions";
import { failure, jsonBody, notSignedIn, tooMany } from "@/shared/api/http";
import { readText } from "@/shared/lib/guards";
import { clientKey, rateLimit } from "@/shared/lib/rateLimit";

export const dynamic = "force-dynamic";

// Sets a new password, after the current one, and signs out the other devices
export const POST = async (request: Request) => {
  const session = await currentSession();
  if (!session) return notSignedIn();
  const { id } = session;

  const limit = rateLimit(clientKey(request, `password:${id}`), 10, 15 * 60_000);
  if (!limit.allowed) return tooMany("auth.problem.wait", limit.retryAfterSeconds);

  const body = await jsonBody(request);
  if (body === null) return failure("Body must be valid JSON", 400);
  const next = readText(body, "next") ?? "";
  const weak = passwordProblem(next);
  if (weak) return failure(weak, 400);

  const stored = await passwordHashOf(id);
  if (stored && !(await verifyPassword(readText(body, "current") ?? "", stored))) {
    return failure("password.problem.current", 403);
  }
  await setPasswordHash(id, await hashPassword(next));
  await endOtherSessions(id, session.signInId);
  return NextResponse.json({ ok: true });
};
