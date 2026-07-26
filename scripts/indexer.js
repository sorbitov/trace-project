import { createDatabase } from "../src/db.js";
import { syncEscrowEvents } from "../src/indexer.js";

const db = createDatabase();
try {
  console.log(await syncEscrowEvents(db));
} finally {
  await db.close();
}
