#!/usr/bin/env npx tsx
/**
 * Database maintenance CLI
 * 
 * Usage:
 *   npx tsx scripts/db-maintenance.ts <command>
 * 
 * Commands:
 *   migrate     - Run pending migrations
 *   backfill    - Backfill searchable columns from JSON data
 *   stats       - Show database statistics
 *   cleanup     - Clean up expired rate limits and orphaned data
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import {
  runMigrations,
  getCurrentVersion,
  backfillClientColumns,
  backfillSessionColumns,
} from "../src/database/migrations.js";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "soap.db");

function getDb(): Database.Database {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found at ${DB_PATH}`);
    process.exit(1);
  }
  
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}

function migrate() {
  console.log("Running database migrations...\n");
  const db = getDb();
  
  const beforeVersion = getCurrentVersion(db);
  console.log(`Current version: ${beforeVersion}`);
  
  runMigrations(db);
  
  const afterVersion = getCurrentVersion(db);
  console.log(`\nFinal version: ${afterVersion}`);
  
  db.close();
}

function backfill() {
  console.log("Backfilling searchable columns...\n");
  const db = getDb();
  
  console.log("Backfilling client columns:");
  backfillClientColumns(db);
  
  console.log("\nBackfilling session columns:");
  backfillSessionColumns(db);
  
  db.close();
  console.log("\nBackfill complete.");
}

function stats() {
  const db = getDb();
  
  console.log("Database Statistics");
  console.log("===================\n");
  
  // Database file size
  const dbStats = fs.statSync(DB_PATH);
  console.log(`Database file: ${DB_PATH}`);
  console.log(`Size: ${(dbStats.size / 1024 / 1024).toFixed(2)} MB\n`);
  
  // Migration version
  const version = getCurrentVersion(db);
  console.log(`Migration version: ${version}\n`);
  
  // Table counts
  const clientCount = (db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number }).count;
  const sessionCount = (db.prepare("SELECT COUNT(*) as count FROM sessions").get() as { count: number }).count;
  const metaCount = (db.prepare("SELECT COUNT(*) as count FROM meta").get() as { count: number }).count;
  
  console.log("Record counts:");
  console.log(`  Clients:  ${clientCount}`);
  console.log(`  Sessions: ${sessionCount}`);
  console.log(`  Meta:     ${metaCount}\n`);
  
  // Sessions per client
  if (clientCount > 0) {
    const avgSessions = (db.prepare(`
      SELECT AVG(session_count) as avg FROM clients WHERE session_count > 0
    `).get() as { avg: number | null })?.avg || 0;
    console.log(`Average sessions per active client: ${avgSessions.toFixed(1)}`);
  }
  
  // Recent activity
  const recentClients = (db.prepare(`
    SELECT COUNT(*) as count FROM clients 
    WHERE updated_at > datetime('now', '-7 days')
  `).get() as { count: number }).count;
  
  const recentSessions = (db.prepare(`
    SELECT COUNT(*) as count FROM sessions 
    WHERE saved_at > datetime('now', '-7 days')
  `).get() as { count: number }).count;
  
  console.log(`\nLast 7 days activity:`);
  console.log(`  Updated clients: ${recentClients}`);
  console.log(`  New sessions:    ${recentSessions}`);
  
  db.close();
}

function cleanup() {
  console.log("Running database cleanup...\n");
  const db = getDb();
  
  // Clean up expired rate limits
  const now = Math.floor(Date.now() / 1000);
  try {
    const deleted = db.prepare("DELETE FROM rate_limits WHERE expires_at < ?").run(now);
    console.log(`Cleaned up ${deleted.changes} expired rate limit entries`);
  } catch (e) {
    console.log("No rate_limits table found (run migrations first)");
  }
  
  // Vacuum database to reclaim space
  console.log("\nRunning VACUUM to optimize database...");
  db.exec("VACUUM");
  
  // Analyze for query optimization
  console.log("Running ANALYZE for query optimization...");
  db.exec("ANALYZE");
  
  db.close();
  console.log("\nCleanup complete.");
}

// Main
const command = process.argv[2];

switch (command) {
  case "migrate":
    migrate();
    break;
  case "backfill":
    backfill();
    break;
  case "stats":
    stats();
    break;
  case "cleanup":
    cleanup();
    break;
  default:
    console.log(`
Database Maintenance CLI

Usage:
  npx tsx scripts/db-maintenance.ts <command>

Commands:
  migrate   - Run pending database migrations
  backfill  - Backfill searchable columns from JSON data
  stats     - Show database statistics
  cleanup   - Clean up expired data and optimize database
`);
    process.exit(1);
}
