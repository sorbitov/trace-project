import { config } from "./src/config.js";
import { createDatabase } from "./src/db.js";
import { createApp } from "./src/app.js";
import { startIndexer } from "./src/indexer.js";

const db = createDatabase();
await db.health();
const app = createApp(db);
const stopIndexer = startIndexer(db);
const server = app.listen(config.port, config.host, () => {
  console.log(`PACT server running at ${config.baseUrl}/index.html (${config.host}:${config.port})`);
});

async function shutdown(signal) {
  console.log(`${signal}: shutting down`);
  stopIndexer();
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
