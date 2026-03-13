import { createMiddleware } from "hono/factory";
import { ENV } from "../database/index.js";

/**
 * Simple admin password authentication middleware for SOAP Notes
 * Checks X-Admin-Password header against ENV.ADMIN_PASSWORD
 */
export const requireAuth = createMiddleware(async (c, next) => {
  const providedPassword = c.req.header("X-Admin-Password");

  if (!providedPassword) {
    return c.json(
      { error: "Authentication required - missing X-Admin-Password header" },
      401,
    );
  }

  if (providedPassword !== ENV.ADMIN_PASSWORD) {
    return c.json({ error: "Authentication failed - invalid password" }, 401);
  }

  await next();
});

/**
 * Rate limiting middleware for authentication attempts
 * Simple in-memory implementation - in production use Redis
 */
const authAttempts = new Map<string, { count: number; resetTime: number }>();

export const authRateLimit = createMiddleware(async (c, next) => {
  const clientIP =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for") ||
    "unknown";

  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const attempts = authAttempts.get(clientIP);

  if (attempts) {
    if (now > attempts.resetTime) {
      // Reset the counter
      authAttempts.set(clientIP, { count: 0, resetTime: now + windowMs });
    } else if (attempts.count >= maxAttempts) {
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

  // Track failed attempts (only for auth endpoints)
  const isAuthEndpoint =
    c.req.path.includes("/admin") || c.req.path.includes("/auth");

  if (isAuthEndpoint) {
    const current = authAttempts.get(clientIP) || {
      count: 0,
      resetTime: now + windowMs,
    };
    authAttempts.set(clientIP, {
      count: current.count + 1,
      resetTime: current.resetTime,
    });
  }

  await next();
});
