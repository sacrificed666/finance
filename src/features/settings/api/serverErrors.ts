import { readArray, readNumber, readString } from "@/shared/lib/guards";

// The address of the server's error log
const ERRORS_URL = "/api/errors";

export interface ServerError {
  at: string;
  route: string;
  message: string;
}

export interface ServerErrors {
  errors: ServerError[];
  total: number;
}

// An error from the server's answer, or null when it is not one
const parseError = (row: unknown): ServerError | null => {
  const at = readString(row, "at");
  const route = readString(row, "route");
  if (!at || !route) return null;
  return { at, route, message: readString(row, "message") ?? "" };
};

// The latest errors the server logged and how many there are, or null
export const fetchServerErrors = async (): Promise<ServerErrors | null> => {
  const response = await fetch(ERRORS_URL, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  const body: unknown = await response.json().catch(() => null);
  return {
    errors: readArray(body, "errors")
      .map(parseError)
      .filter((entry) => entry !== null),
    total: readNumber(body, "total") ?? 0,
  };
};

// Clears the error log, true when the server did
export const clearServerErrors = async (): Promise<boolean> => {
  const response = await fetch(ERRORS_URL, { method: "DELETE" }).catch(() => null);
  return response?.ok === true;
};

// The digest Next.js gives a failure that came from the server, if any
const digestOf = (error: unknown): string | undefined => {
  const digest: unknown = error instanceof Error ? Reflect.get(error, "digest") : undefined;
  return typeof digest === "string" ? digest : undefined;
};

// Tells the server about a page that failed in the browser, for the owner's log
export const reportClientError = async (error: unknown, page: string): Promise<void> => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  await fetch(ERRORS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, message, digest: digestOf(error) }),
    keepalive: true,
  }).catch(() => null);
};
