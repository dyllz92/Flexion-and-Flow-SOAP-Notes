#!/usr/bin/env node

/**
 * Utility script to clear encrypted data from the database
 * Use this if the application cannot start due to corrupted encryption data
 */

import Database from "better-sqlite3";
import { join } from "path";
import { existsSync } from "fs";

const DB_PATH =
  process.env.DATABASE_PATH || join(process.cwd(), "data", "db.sqlite");

if (!existsSync(DB_PATH)) {
  console.error(`Database not found at: ${DB_PATH}`);
  console.log(
    "Please set DATABASE_PATH environment variable or ensure the database exists",
  );
  process.exit(1);
}

const db = new Database(DB_PATH);

// List of encrypted keys that might be corrupted
const ENCRYPTED_KEYS = ["global_drive_refresh_token"];

try {
  console.log("Clearing potentially corrupted encrypted data...");

  for (const key of ENCRYPTED_KEYS) {
    const result = db.prepare("DELETE FROM meta WHERE key = ?").run(key);
    if (result.changes > 0) {
      console.log(`✓ Cleared: ${key}`);
    } else {
      console.log(`- No data found for: ${key}`);
    }
  }

  console.log(
    "\nDone! The application should now be able to start and regenerate tokens.",
  );
  console.log("Note: You may need to re-authenticate with Google Drive.");
} catch (error) {
  console.error("Error clearing data:", error);
  process.exit(1);
} finally {
  db.close();
}
