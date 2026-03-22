import type Database from "better-sqlite3";

/**
 * Database Migration System
 * 
 * Each migration has:
 * - version: unique identifier (timestamp-based recommended)
 * - name: human-readable description
 * - up: function to apply migration
 * - down: function to rollback (optional)
 */

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
  down?: (db: Database.Database) => void;
}

/**
 * All migrations in order
 * Add new migrations at the end with incrementing version numbers
 */
export const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: (db) => {
      // This is the baseline schema - already exists in most databases
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
    },
  },
  {
    version: 2,
    name: "add_migrations_table",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          version    INTEGER PRIMARY KEY,
          name       TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 3,
    name: "add_client_searchable_columns",
    up: (db) => {
      // Add searchable columns extracted from JSON for better query performance
      // These are nullable to support existing data
      const columns = [
        "first_name TEXT",
        "last_name TEXT", 
        "phone TEXT",
        "session_count INTEGER DEFAULT 0",
        "last_session_date TEXT",
      ];
      
      for (const col of columns) {
        const colName = col.split(" ")[0];
        try {
          db.exec(`ALTER TABLE clients ADD COLUMN ${col}`);
        } catch (e: any) {
          // Column may already exist
          if (!e.message.includes("duplicate column")) {
            throw e;
          }
        }
      }
      
      // Create indexes for common searches
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(first_name, last_name);
        CREATE INDEX IF NOT EXISTS idx_clients_last_session ON clients(last_session_date);
      `);
    },
  },
  {
    version: 4,
    name: "add_session_searchable_columns",
    up: (db) => {
      // Add searchable columns for sessions
      const columns = [
        "client_name TEXT",
        "therapist_name TEXT",
      ];
      
      for (const col of columns) {
        const colName = col.split(" ")[0];
        try {
          db.exec(`ALTER TABLE sessions ADD COLUMN ${col}`);
        } catch (e: any) {
          if (!e.message.includes("duplicate column")) {
            throw e;
          }
        }
      }
    },
  },
  {
    version: 5,
    name: "add_rate_limit_table",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          key        TEXT PRIMARY KEY,
          count      INTEGER NOT NULL DEFAULT 0,
          window_start INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);
      `);
    },
  },
];

/**
 * Get current database version
 */
export function getCurrentVersion(db: Database.Database): number {
  try {
    // Check if migrations table exists
    const tableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"
      )
      .get();
    
    if (!tableExists) {
      return 0;
    }
    
    const row = db
      .prepare("SELECT MAX(version) as version FROM migrations")
      .get() as { version: number | null } | undefined;
    
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Run all pending migrations
 */
export function runMigrations(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);
  const pendingMigrations = migrations.filter((m) => m.version > currentVersion);
  
  if (pendingMigrations.length === 0) {
    return;
  }
  
  console.log(`Running ${pendingMigrations.length} pending migration(s)...`);
  
  for (const migration of pendingMigrations) {
    console.log(`  Applying migration ${migration.version}: ${migration.name}`);
    
    try {
      // Run migration in a transaction
      db.transaction(() => {
        migration.up(db);
        
        // Ensure migrations table exists before recording
        db.exec(`
          CREATE TABLE IF NOT EXISTS migrations (
            version    INTEGER PRIMARY KEY,
            name       TEXT NOT NULL,
            applied_at TEXT NOT NULL
          );
        `);
        
        // Record migration
        db.prepare(
          "INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)"
        ).run(migration.version, migration.name, new Date().toISOString());
      })();
      
      console.log(`  ✓ Migration ${migration.version} complete`);
    } catch (error) {
      console.error(`  ✗ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }
  
  console.log("All migrations complete.");
}

/**
 * Backfill searchable columns from JSON data
 * Run this after migration 3 to populate new columns
 */
export function backfillClientColumns(db: Database.Database): void {
  const clients = db.prepare("SELECT account_number, data FROM clients").all() as {
    account_number: string;
    data: string;
  }[];
  
  const updateStmt = db.prepare(`
    UPDATE clients 
    SET first_name = ?, last_name = ?, phone = ?, session_count = ?, last_session_date = ?
    WHERE account_number = ?
  `);
  
  let updated = 0;
  for (const row of clients) {
    try {
      const data = JSON.parse(row.data);
      updateStmt.run(
        data.firstName || null,
        data.lastName || null,
        data.phone || null,
        data.sessionCount || 0,
        data.lastSessionDate || null,
        row.account_number
      );
      updated++;
    } catch (e) {
      console.warn(`Failed to backfill client ${row.account_number}:`, e);
    }
  }
  
  console.log(`Backfilled ${updated} client records`);
}

/**
 * Backfill session searchable columns
 */
export function backfillSessionColumns(db: Database.Database): void {
  const sessions = db.prepare("SELECT session_id, data FROM sessions").all() as {
    session_id: string;
    data: string;
  }[];
  
  const updateStmt = db.prepare(`
    UPDATE sessions 
    SET client_name = ?, therapist_name = ?
    WHERE session_id = ?
  `);
  
  let updated = 0;
  for (const row of sessions) {
    try {
      const data = JSON.parse(row.data);
      updateStmt.run(
        data.clientName || null,
        data.therapistName || null,
        row.session_id
      );
      updated++;
    } catch (e) {
      console.warn(`Failed to backfill session ${row.session_id}:`, e);
    }
  }
  
  console.log(`Backfilled ${updated} session records`);
}
