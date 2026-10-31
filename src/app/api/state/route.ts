import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/features/auth/model/auth";
import { loadState, saveChanges, stateRevision } from "@/features/data/api/repo";
import { resealOlderRecords } from "@/features/data/api/reseal";
import { describeChanges, parseChanges } from "@/features/data/model/changes";
import { logError } from "@/features/settings/api/errorLog";
import { failure, jsonBody } from "@/shared/api/http";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/shared/i18n/locales";
import { isRecord } from "@/shared/lib/guards";
import { log } from "@/shared/lib/log";

export const dynamic = "force-dynamic";

// The signed-in account, once records under an older key are sealed again
const stateUserId = async (): Promise<string | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  await resealOlderRecords(id);
  return id;
};

// The answer to a visitor without an account
const unauthorized = () => failure("Sign in to load your data.", 401);

// Logs a failed load or save and answers without its details
const fail = (error: unknown) => {
  void logError("api/state", error);
  return failure("The server could not reach your data. Try again in a moment.", 500);
};

// A revision as a strong ETag
const toEtag = (revision: string): string => JSON.stringify(revision);

// The language of the cookie, for accounts that have not chosen one yet
const cookieLocale = async (): Promise<Locale> => {
  const preferred = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(preferred) ? preferred : DEFAULT_LOCALE;
};

// The account's whole state with its revision
export const GET = async () => {
  try {
    const userId = await stateUserId();
    if (!userId) return unauthorized();
    const { state, revision } = await loadState(userId, await cookieLocale());
    return NextResponse.json(state, { headers: { ETag: toEtag(revision), "X-Account": userId } });
  } catch (error) {
    return fail(error);
  }
};

// The revision alone, so a tab can tell whether another one saved
export const HEAD = async () => {
  const userId = await stateUserId();
  if (!userId) return new NextResponse(null, { status: 401 });
  try {
    return new NextResponse(null, { headers: { ETag: toEtag(await stateRevision(userId)) } });
  } catch (error) {
    await logError("api/state", error);
    return new NextResponse(null, { status: 500 });
  }
};

// Saves changes made since a revision, merging when another tab saved first
export const PATCH = async (request: Request) => {
  const userId = await stateUserId();
  if (!userId) return unauthorized();
  const body = await jsonBody(request);
  if (body === null) return failure("Body must be valid JSON", 400);
  const changes = isRecord(body) ? parseChanges(body.changes) : null;
  if (!isRecord(body) || !changes) return failure("Expected { base, changes }", 400);
  const base = typeof body.base === "string" && body.base !== "" ? body.base : null;
  try {
    const result = await saveChanges(userId, changes, base, await cookieLocale());
    log.info("Saved changes", { sent: describeChanges(changes), written: result.written, merged: result.stale });
    return NextResponse.json(result, { headers: { ETag: toEtag(result.revision) } });
  } catch (error) {
    return fail(error);
  }
};
