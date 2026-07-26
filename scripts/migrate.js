import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const databaseUrl = process.env.DATABASE_URL || "postgres://trace:trace@127.0.0.1:5432/trace";
const sql = await readFile(join(root, "migrations", "001_initial.sql"), "utf8");
const pool = new pg.Pool({ connectionString: databaseUrl });
try {
  await pool.query(sql);
  console.log("Database migration complete");
} finally {
  await pool.end();
}
