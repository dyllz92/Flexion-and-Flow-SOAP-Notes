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
import {
  encrypt,
  safeDecrypt,
  ensureEncrypted,
  isEncrypted,
} from "../utils/crypto.js";
import { runMigrations } from "./migrations.js";

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
  ADMIN_PASSWORD:
    process.env.ADMIN_PASSWORD ||
    (() => {
      console.error("CRITICAL: ADMIN_PASSWORD environment variable not set!");
      process.exit(1);
    })(),
  DATA_DIR: process.env.DATA_DIR || path.join(process.cwd(), "data"),
  PORT: parseInt(process.env.PORT || "3000", 10),
  DASHBOARD_WEBHOOK_URL: process.env.DASHBOARD_WEBHOOK_URL || "",
  SESSION_SECRET: process.env.SESSION_SECRET || "",
  WEBHOOK_SECRET_SOAP: process.env.WEBHOOK_SECRET_SOAP || "",
  INTAKE_FORM_URL: process.env.INTAKE_FORM_URL || "",
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

  // Run migrations (creates tables if needed)
  runMigrations(db);

  return db;
}

// Initialize database instance
export const db = initializeDatabase();

/** Keys that should be encrypted at rest */
const ENCRYPTED_KEYS = new Set(["global_drive_refresh_token"]);

/**
 * KV-compatible adapter over SQLite meta table
 * Automatically encrypts/decrypts sensitive keys
 */
export const kv: KVStore = {
  get(key: string): string | null {
    const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
      | MetaRow
      | undefined;
    if (!row?.value) return null;

    // Decrypt if this is a sensitive key
    if (ENCRYPTED_KEYS.has(key)) {
      try {
        const decrypted = safeDecrypt(row.value);

        // If safeDecrypt returned the original value but it's supposed to be encrypted,
        // this means decryption failed and we have corrupted data
        if (decrypted === row.value && isEncrypted(row.value)) {
          console.warn(
            `Corrupted encrypted data detected for key: ${key}. Clearing...`,
          );
          // Clear the corrupted encrypted data
          db.prepare("DELETE FROM meta WHERE key = ?").run(key);
          return null;
        }

        return decrypted;
      } catch (error) {
        console.error(`Failed to decrypt key: ${key}`, error);
        // Clear the corrupted data and return null
        db.prepare("DELETE FROM meta WHERE key = ?").run(key);
        return null;
      }
    }
    return row.value;
  },

  put(key: string, value: string): void {
    // Encrypt if this is a sensitive key
    const storedValue = ENCRYPTED_KEYS.has(key)
      ? ensureEncrypted(value)
      : value;
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
      key,
      storedValue,
    );
  },

  del(key: string): void {
    db.prepare("DELETE FROM meta WHERE key = ?").run(key);
  },
};

// Seed Google refresh token from env if not already stored (will be encrypted)
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
 * Decrypts driveToken if present
 */
export function getClient(accountNumber: string): ClientRecord | null {
  const row = db
    .prepare("SELECT data FROM clients WHERE account_number = ?")
    .get(accountNumber) as ClientRow | undefined;
  if (!row) return null;
  try {
    const client = JSON.parse(row.data) as ClientRecord;
    // Decrypt driveToken if present
    if (client.driveToken) {
      client.driveToken = safeDecrypt(client.driveToken);
    }
    return client;
  } catch (error) {
    console.error("Failed to parse client data:", error);
    return null;
  }
}

/**
 * Save or update client record
 * Encrypts driveToken if present
 * Also populates searchable columns for better query performance
 */
export function saveClient(client: ClientRecord): void {
  // Create a copy for storage with encrypted driveToken
  const clientToStore = { ...client };
  if (clientToStore.driveToken) {
    clientToStore.driveToken = ensureEncrypted(clientToStore.driveToken);
  }

  db.prepare(
    `
    INSERT OR REPLACE INTO clients (
      account_number, id, data, email, created_at, updated_at,
      first_name, last_name, phone, session_count, last_session_date,
      dashboard_client_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    client.accountNumber,
    client.id,
    JSON.stringify(clientToStore),
    client.email?.toLowerCase() || null,
    client.createdAt,
    client.updatedAt,
    // Searchable columns
    client.firstName || null,
    client.lastName || null,
    client.phone || null,
    client.sessionCount || 0,
    client.lastSessionDate || null,
    client.dashboardClientId || null,
  );
}

/**
 * Save or update session record
 * Also populates searchable columns
 */
export function saveSession(session: SessionRecord): void {
  db.prepare(
    `
    INSERT OR REPLACE INTO sessions (
      session_id, account_number, session_date, data, saved_at,
      client_name, therapist_name
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    session.sessionId,
    session.accountNumber,
    session.sessionDate,
    JSON.stringify(session),
    session.savedAt,
    // Searchable columns
    session.clientName || null,
    session.therapistName || null,
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
