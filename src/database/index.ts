import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type {
  ClientRecord,
  SessionRecord,
  KVStore,
  ClientRow,
  SessionRow,
  MetaRow,
} from "../types/index.js";

/**
 * Environment configuration
 */
export const ENV = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "",
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || "",
  GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "changeme",
  DATA_DIR: process.env.DATA_DIR || path.join(process.cwd(), "data"),
  PORT: parseInt(process.env.PORT || "3000", 10),
};

/**
 * Initialize SQLite database with proper schemas
 */
function initializeDatabase(): Database.Database {
  // Ensure data directory exists
  fs.mkdirSync(ENV.DATA_DIR, { recursive: true });

  const db = new Database(path.join(ENV.DATA_DIR, "soap.db"));

  // Enable WAL mode for better concurrency and foreign keys
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Create tables with proper schemas
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      account_number TEXT PRIMARY KEY,
      id             TEXT UNIQUE NOT NULL,
      data           TEXT NOT NULL,
      email          TEXT,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

    CREATE TABLE IF NOT EXISTS sessions (
      session_id     TEXT PRIMARY KEY,
      account_number TEXT NOT NULL,
      session_date   TEXT NOT NULL,
      data           TEXT NOT NULL,
      saved_at       TEXT NOT NULL,
      FOREIGN KEY (account_number) REFERENCES clients(account_number)
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_number);

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return db;
}

// Initialize database instance
export const db = initializeDatabase();

/**
 * KV-compatible adapter over SQLite meta table
 */
export const kv: KVStore = {
  get(key: string): string | null {
    const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
      | MetaRow
      | undefined;
    return row?.value ?? null;
  },

  put(key: string, value: string): void {
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
      key,
      value,
    );
  },

  del(key: string): void {
    db.prepare("DELETE FROM meta WHERE key = ?").run(key);
  },
};

// Seed Google refresh token from env if not already stored
if (ENV.GOOGLE_REFRESH_TOKEN && !kv.get("global_drive_refresh_token")) {
  kv.put("global_drive_refresh_token", ENV.GOOGLE_REFRESH_TOKEN);
}

/**
 * Generate unique account number with format FF-YYYYMM-XXXX
 */
export function generateAccountNumber(): string {
  const now = new Date();
  const ym =
    now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, "0");
  const counterKey = `counter:${ym}`;
  const raw = kv.get(counterKey);
  const next = raw ? parseInt(raw) + 1 : 1;
  kv.put(counterKey, String(next));
  return `FF-${ym}-${String(next).padStart(4, "0")}`;
}

/**
 * Find client by email address
 */
export function findClientByEmail(email: string): ClientRecord | null {
  if (!email) return null;
  const row = db
    .prepare("SELECT data FROM clients WHERE email = ?")
    .get(email.toLowerCase()) as ClientRow | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch (error) {
    console.error("Failed to parse client data:", error);
    return null;
  }
}

/**
 * Get client by account number
 */
export function getClient(accountNumber: string): ClientRecord | null {
  const row = db
    .prepare("SELECT data FROM clients WHERE account_number = ?")
    .get(accountNumber) as ClientRow | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch (error) {
    console.error("Failed to parse client data:", error);
    return null;
  }
}

/**
 * Save or update client record
 */
export function saveClient(client: ClientRecord): void {
  db.prepare(
    `
    INSERT OR REPLACE INTO clients (account_number, id, data, email, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    client.accountNumber,
    client.id,
    JSON.stringify(client),
    client.email?.toLowerCase() || null,
    client.createdAt,
    client.updatedAt,
  );
}

/**
 * Save or update session record
 */
export function saveSession(session: SessionRecord): void {
  db.prepare(
    `
    INSERT OR REPLACE INTO sessions (session_id, account_number, session_date, data, saved_at)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(
    session.sessionId,
    session.accountNumber,
    session.sessionDate,
    JSON.stringify(session),
    session.savedAt,
  );
}

/**
 * Get all clients with basic info for listing
 */
export function getAllClients(): Array<
  Pick<
    ClientRecord,
    | "accountNumber"
    | "firstName"
    | "lastName"
    | "email"
    | "sessionCount"
    | "lastSessionDate"
  >
> {
  const rows = db
    .prepare("SELECT data FROM clients ORDER BY updated_at DESC")
    .all() as ClientRow[];
  return rows
    .map((row) => {
      try {
        const client = JSON.parse(row.data) as ClientRecord;
        return {
          accountNumber: client.accountNumber,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          sessionCount: client.sessionCount,
          lastSessionDate: client.lastSessionDate,
        };
      } catch (error) {
        console.error("Failed to parse client data:", error);
        return {
          accountNumber: "",
          firstName: "Error",
          lastName: "Parsing",
          email: "",
          sessionCount: 0,
          lastSessionDate: "",
        };
      }
    })
    .filter((client) => client.accountNumber); // Filter out any parsing errors
}

/**
 * Get sessions for a specific client
 */
export function getClientSessions(accountNumber: string): SessionRecord[] {
  const rows = db
    .prepare(
      "SELECT data FROM sessions WHERE account_number = ? ORDER BY session_date DESC",
    )
    .all(accountNumber) as SessionRow[];
  return rows
    .map((row) => {
      try {
        return JSON.parse(row.data) as SessionRecord;
      } catch (error) {
        console.error("Failed to parse session data:", error);
        return null;
      }
    })
    .filter(Boolean) as SessionRecord[];
}

/**
 * Get single session by ID
 */
export function getSession(sessionId: string): SessionRecord | null {
  const row = db
    .prepare("SELECT data FROM sessions WHERE session_id = ?")
    .get(sessionId) as SessionRow | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.data) as SessionRecord;
  } catch (error) {
    console.error("Failed to parse session data:", error);
    return null;
  }
}
