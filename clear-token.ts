import Database from "better-sqlite3";
import path from "node:path";

// Direct database access without full app initialization
const DATA_DIR = path.join(process.cwd(), "data");
const dbPath = path.join(DATA_DIR, "soap.db");

console.log("Permanently removing corrupted token...");
const db = new Database(dbPath);

// Clear the problematic key
console.log("Deleting global_drive_refresh_token...");
const deleteResult = db
  .prepare("DELETE FROM meta WHERE key = ?")
  .run("global_drive_refresh_token");
console.log("Deleted rows:", deleteResult.changes);

// Check remaining entries
console.log("Final meta entries:");
const remaining = db.prepare("SELECT key, value FROM meta").all();
console.log(remaining);

db.close();
console.log("Done - token permanently cleared");
