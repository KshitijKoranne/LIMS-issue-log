import { createClient, type Client } from "@libsql/client";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

export function isDbConfigured() {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

export function getClient() {
  if (!isDbConfigured()) {
    throw new Error("Turso is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.");
  }

  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!
    });
  }

  return client;
}

async function applyBusinessUnitConstraintMigration(db: Client) {
  const table = await db.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: ["issues"]
  });
  const createSql = String(table.rows[0]?.sql || "");

  if (!createSql || createSql.includes("'Both'")) {
    return;
  }

  await db.execute("PRAGMA foreign_keys = OFF");
  await db.execute("DROP TABLE IF EXISTS issues_next");
  await db.execute(`
    CREATE TABLE issues_next (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Open', 'Ongoing', 'Closed')),
      location TEXT NOT NULL CHECK (location IN ('Vadodara', 'Vapi', 'Both')),
      module_id TEXT REFERENCES modules(id) ON DELETE SET NULL,
      module_name_snapshot TEXT,
      priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
      ai_category TEXT,
      ai_subcategory TEXT,
      ai_summary TEXT,
      ai_confidence REAL,
      ai_processed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT
    )
  `);
  await db.execute(`
    INSERT INTO issues_next (
      id, title, description, status, location, module_id, module_name_snapshot,
      priority, ai_category, ai_subcategory, ai_summary, ai_confidence,
      ai_processed_at, created_at, updated_at, closed_at
    )
    SELECT
      id, title, description, status, location, module_id, module_name_snapshot,
      priority, ai_category, ai_subcategory, ai_summary, ai_confidence,
      ai_processed_at, created_at, updated_at, closed_at
    FROM issues
  `);
  await db.execute("DROP TABLE issues");
  await db.execute("ALTER TABLE issues_next RENAME TO issues");
  await db.execute("PRAGMA foreign_keys = ON");
}

export async function applySchema() {
  const schema = await readFile(join(process.cwd(), "db/schema.sql"), "utf8");
  const statements = schema
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  const db = getClient();
  for (const statement of statements) {
    await db.execute(statement);
  }

  await applyBusinessUnitConstraintMigration(db);

  for (const statement of statements.filter((statement) => statement.startsWith("CREATE INDEX"))) {
    await db.execute(statement);
  }

  return statements.length;
}

export async function ensureSchema() {
  if (!isDbConfigured()) {
    return;
  }

  if (!schemaReady) {
    schemaReady = applySchema().then(() => undefined);
  }

  return schemaReady;
}
