import { getPool } from "@/shared/api/db";

// How long the database may take to answer before it counts as down
const DATABASE_TIMEOUT_MS = 2000;

const HEADERS = { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" };

// Whether Postgres answers a trivial query in time
const databaseAnswers = async (): Promise<boolean> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const late = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("The database took too long")), DATABASE_TIMEOUT_MS);
    });
    await Promise.race([getPool().query("SELECT 1"), late]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

// Answers health checks: the server alone, or with ?db=1 its database too
export const GET = async (request: Request) => {
  if (new URL(request.url).searchParams.get("db") === null) return new Response("ok\n", { headers: HEADERS });
  return (await databaseAnswers())
    ? new Response("ok\n", { headers: HEADERS })
    : new Response("database unreachable\n", { status: 503, headers: HEADERS });
};
