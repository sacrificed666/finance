import { NextResponse } from "next/server";

import { createAccount } from "@/features/auth/model/accounts";
import { signUpAllowed } from "@/features/auth/model/authConfig";
import { hashPassword, passwordProblem } from "@/features/auth/model/password";
import { logError } from "@/features/settings/api/errorLog";
import { failure, jsonBody, tooMany } from "@/shared/api/http";
import { readString, readText } from "@/shared/lib/guards";
import { clientKey, rateLimit } from "@/shared/lib/rateLimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

// Creates an account, answering a problem with the message key that explains it
export const POST = async (request: Request) => {
  const limit = rateLimit(clientKey(request, "register"), 5, 15 * 60_000);
  if (!limit.allowed) return tooMany("auth.problem.wait", limit.retryAfterSeconds);

  const body = await jsonBody(request);
  if (body === null) return failure("Body must be valid JSON", 400);
  const email = (readText(body, "email") ?? "").trim().toLowerCase();
  const password = readText(body, "password") ?? "";
  const name = readString(body, "name");

  if (!EMAIL_RE.test(email)) return failure("auth.error.email", 400);
  if (!signUpAllowed(email)) return failure("auth.problem.closed", 403);
  const weak = passwordProblem(password);
  if (weak) return failure(weak, 400);

  try {
    const created = await createAccount(email, await hashPassword(password), name);
    if (!created) return failure("auth.problem.taken", 409);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    await logError("api/auth/register", error);
    return failure("auth.error.create", 500);
  }
};
