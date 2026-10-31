import { NextResponse } from "next/server";

// The request's JSON body, or null when it is missing or broken
export const jsonBody = async (request: Request): Promise<unknown> => {
  try {
    const body: unknown = await request.json();
    return body;
  } catch {
    return null;
  }
};

// A JSON answer with an error and its status
export const failure = (error: string, status: number) => NextResponse.json({ error }, { status });

// The answer to a request that needs an account
export const notSignedIn = () => failure("Not signed in.", 401);

// A 429 answer that says when to try again
export const tooMany = (error: string, retryAfterSeconds: number) =>
  NextResponse.json({ error }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
