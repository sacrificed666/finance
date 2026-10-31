import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORT = Number(process.env.E2E_DB_PORT ?? 4030);

// An empty Postgres in memory, gone with the test run; no real data comes near it
const db = await PGlite.create();
const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1", maxConnections: 32 });
await server.start();
process.stdout.write(`Throwaway Postgres on postgresql://postgres@127.0.0.1:${String(PORT)}/postgres\n`);

// Stops the database when Playwright ends the run
const stop = () => {
  void server.stop().finally(() => process.exit(0));
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
