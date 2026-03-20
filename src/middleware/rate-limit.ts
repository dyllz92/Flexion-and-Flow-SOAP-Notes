import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import type Database from "better-sqlite3";

/**
 * Rate Limiting Middleware
 * 
 * Uses SQLite for distributed rate limiting (works across restarts)
 * with in-memory fallback for performance
 */

interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in seconds */
  windowSec: number;
  /** Key generator function (default: IP-based) */
  keyGenerator?: (c: Context) => string;
  /** Custom message on rate limit exceeded */
  message?: string;
  /** Skip rate limiting for certain conditions */
  skip?: (c: Context) => boolean;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  expiresAt: number;
}

// In-memory cache for hot paths
const memoryCache = new Map<string, RateLimitEntry>();

// Cleanup interval (every 60 seconds)
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Get client IP from request
 */
function getClientIP(c: Context): string {
  // Check common proxy headers
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIP = c.req.header("x-real-ip");
  if (realIP) {
    return realIP;
  }
  
  // Fallback to connection info (may not be available in all environments)
  return "unknown";
}

/**
 * Create rate limiting middleware with SQLite persistence
 */
export function createRateLimiter(
  db: Database.Database | null,
  config: RateLimitConfig
) {
  const {
    maxRequests,
    windowSec,
    keyGenerator = (c) => `ip:${getClientIP(c)}`,
    message = "Too many requests. Please try again later.",
    skip,
  } = config;

  // Ensure rate_limits table exists
  if (db) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          key        TEXT PRIMARY KEY,
          count      INTEGER NOT NULL DEFAULT 0,
          window_start INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);
      `);
    } catch (e) {
      console.warn("Could not create rate_limits table:", e);
    }

    // Start cleanup interval
    if (!cleanupInterval) {
      cleanupInterval = setInterval(() => {
        cleanupExpired(db);
      }, 60000);
    }
  }

  return createMiddleware(async (c: Context, next: Next) => {
    // Check skip condition
    if (skip && skip(c)) {
      await next();
      return;
    }

    const key = keyGenerator(c);
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % windowSec);
    const expiresAt = windowStart + windowSec;
    const fullKey = `${key}:${windowStart}`;

    let entry = getEntry(db, fullKey, windowStart);

    if (entry.count >= maxRequests) {
      c.header("X-RateLimit-Limit", String(maxRequests));
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", String(expiresAt));
      c.header("Retry-After", String(expiresAt - now));

      return c.json({ error: message }, 429);
    }

    // Increment counter
    entry.count++;
    setEntry(db, fullKey, entry);

    // Set rate limit headers
    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", String(Math.max(0, maxRequests - entry.count)));
    c.header("X-RateLimit-Reset", String(expiresAt));

    await next();
  });
}

/**
 * Get rate limit entry from cache or database
 */
function getEntry(
  db: Database.Database | null,
  key: string,
  windowStart: number
): RateLimitEntry {
  // Check memory cache first
  const cached = memoryCache.get(key);
  if (cached && cached.windowStart === windowStart) {
    return cached;
  }

  // Check database
  if (db) {
    try {
      const row = db
        .prepare("SELECT count, window_start, expires_at FROM rate_limits WHERE key = ?")
        .get(key) as { count: number; window_start: number; expires_at: number } | undefined;

      if (row && row.window_start === windowStart) {
        const entry: RateLimitEntry = {
          count: row.count,
          windowStart: row.window_start,
          expiresAt: row.expires_at,
        };
        memoryCache.set(key, entry);
        return entry;
      }
    } catch (e) {
      // Database error, fall back to memory only
    }
  }

  // Create new entry
  const entry: RateLimitEntry = {
    count: 0,
    windowStart,
    expiresAt: windowStart + 60,
  };
  memoryCache.set(key, entry);
  return entry;
}

/**
 * Save rate limit entry to cache and database
 */
function setEntry(
  db: Database.Database | null,
  key: string,
  entry: RateLimitEntry
): void {
  memoryCache.set(key, entry);

  if (db) {
    try {
      db.prepare(
        `INSERT OR REPLACE INTO rate_limits (key, count, window_start, expires_at)
         VALUES (?, ?, ?, ?)`
      ).run(key, entry.count, entry.windowStart, entry.expiresAt);
    } catch (e) {
      // Database error, memory cache will still work
    }
  }
}

/**
 * Clean up expired entries
 */
function cleanupExpired(db: Database.Database | null): void {
  const now = Math.floor(Date.now() / 1000);

  // Clean memory cache
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
    }
  }

  // Clean database
  if (db) {
    try {
      db.prepare("DELETE FROM rate_limits WHERE expires_at < ?").run(now);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// ─── Pre-configured rate limiters ───────────────────────────────────────────

/**
 * Standard API rate limiter: 100 requests per minute
 */
export function standardRateLimiter(db: Database.Database | null) {
  return createRateLimiter(db, {
    maxRequests: 100,
    windowSec: 60,
  });
}

/**
 * Strict rate limiter for sensitive endpoints: 10 requests per minute
 */
export function strictRateLimiter(db: Database.Database | null) {
  return createRateLimiter(db, {
    maxRequests: 10,
    windowSec: 60,
    message: "Rate limit exceeded. Please wait before trying again.",
  });
}

/**
 * AI endpoint rate limiter: 20 requests per minute (expensive operations)
 */
export function aiRateLimiter(db: Database.Database | null) {
  return createRateLimiter(db, {
    maxRequests: 20,
    windowSec: 60,
    message: "AI request limit reached. Please wait before generating more notes.",
  });
}

/**
 * Upload rate limiter: 30 requests per minute
 */
export function uploadRateLimiter(db: Database.Database | null) {
  return createRateLimiter(db, {
    maxRequests: 30,
    windowSec: 60,
    message: "Upload limit reached. Please wait before uploading more files.",
  });
}
