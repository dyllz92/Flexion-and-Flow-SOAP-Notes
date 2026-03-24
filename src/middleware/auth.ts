import { createMiddleware } from "hono/factory";
import { timingSafeEqual } from "node:crypto";
import { ENV } from "../database/index.js";
import { logSecurityEvent, AUDIT_EVENTS } from "../utils/audit.js";

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  // If lengths differ, still do comparison but return false
  // This prevents length-based timing attacks
  if (aBuffer.length !== bBuffer.length) {
    // Compare against itself to maintain constant time
    timingSafeEqual(aBuffer, aBuffer);
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

// requireAuth middleware is now defined below after the helper functions

/**
 * Rate limiting middleware for authentication attempts
 * Simple in-memory implementation - in production use Redis
 */
const authAttempts = new Map<string, { count: number; resetTime: number }>();

/**
 * Get client IP for rate limiting
 */
function getClientIP(c: any): string {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Record a failed authentication attempt
 */
function recordFailedAttempt(clientIP: string): void {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes

  const current = authAttempts.get(clientIP) || {
    count: 0,
    resetTime: now + windowMs,
  };

  // Reset if window expired
  if (now > current.resetTime) {
    authAttempts.set(clientIP, { count: 1, resetTime: now + windowMs });
  } else {
    authAttempts.set(clientIP, {
      count: current.count + 1,
      resetTime: current.resetTime,
    });
  }

  // Log failed attempt
  logSecurityEvent(
    "warn",
    AUDIT_EVENTS.AUTH_FAILED,
    {
      attemptCount: current.count + 1,
      windowResetTime: new Date(current.resetTime).toISOString(),
    },
    { userIP: clientIP },
  );
}

export const authRateLimit = createMiddleware(async (c, next) => {
  const clientIP = getClientIP(c);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const attempts = authAttempts.get(clientIP);

  if (attempts) {
    if (now > attempts.resetTime) {
      // Reset the counter
      authAttempts.set(clientIP, { count: 0, resetTime: now + windowMs });
    } else if (attempts.count >= maxAttempts) {
      await logSecurityEvent(
        "warn",
        AUDIT_EVENTS.AUTH_BLOCKED,
        {
          attemptCount: attempts.count,
          retryAfter: Math.ceil((attempts.resetTime - now) / 1000),
        },
        { userIP: clientIP },
      );

      return c.json(
        {
          error: "Too many authentication attempts - try again later",
          retryAfter: Math.ceil((attempts.resetTime - now) / 1000),
        },
        429,
      );
    }
  } else {
    authAttempts.set(clientIP, { count: 0, resetTime: now + windowMs });
  }

  await next();
});

/**
 * Enhanced auth middleware that properly tracks only failed attempts
 */
export const requireAuth = createMiddleware(async (c, next) => {
  const providedPassword = c.req.header("X-Admin-Password");

  if (!providedPassword) {
    recordFailedAttempt(getClientIP(c));
    return c.json(
      { error: "Authentication required - missing X-Admin-Password header" },
      401,
    );
  }

  // Use timing-safe comparison to prevent timing attacks
  if (!secureCompare(providedPassword, ENV.ADMIN_PASSWORD as string)) {
    recordFailedAttempt(getClientIP(c));
    return c.json({ error: "Authentication failed - invalid password" }, 401);
  }

  await next();
});
