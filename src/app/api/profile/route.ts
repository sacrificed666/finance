import { NextResponse } from "next/server";

import { currentUserId } from "@/features/auth/model/currentUser";
import { loadProfile, saveProfile } from "@/features/profile/api/profileRepo";
import { patchProblem, profilePatch } from "@/features/profile/model/profileFields";
import { logError } from "@/features/settings/api/errorLog";
import { failure, jsonBody, notSignedIn } from "@/shared/api/http";
import { isRecord } from "@/shared/lib/guards";

export const dynamic = "force-dynamic";

// The signed-in account's profile
export const GET = async () => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  const profile = await loadProfile(id);
  return profile ? NextResponse.json(profile) : failure("No such account.", 404);
};

// Saves the profile fields the request changes and returns the profile
export const PATCH = async (request: Request) => {
  const id = await currentUserId();
  if (!id) return notSignedIn();
  const body = await jsonBody(request);
  if (!isRecord(body)) return failure("Body must be valid JSON", 400);
  const patch = profilePatch(body);
  const problem = patchProblem(patch);
  if (problem) return failure(problem, 400);
  try {
    await saveProfile(id, patch);
    return NextResponse.json(await loadProfile(id));
  } catch (error) {
    await logError("api/profile", error);
    return failure("profile.saveFailed", 500);
  }
};
