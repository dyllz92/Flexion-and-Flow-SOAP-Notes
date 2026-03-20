import { createMiddleware } from "hono/factory";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Context } from "hono";

/**
 * CSRF Protection Middleware
 * 
 * Implements double-submit cookie pattern:
 * 1. Sets a CSRF token in a cookie
 * 2. Requires the same token in X-CSRF-Token header for state-changing requests
 * 
 * Safe methods (GET, HEAD, OPTIONS) are exempt
 */

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_LENGTH = 32;
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

/** Methods that don't require CSRF protection */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Paths exempt from CSRF (webhooks from external services) */
const EXEMPT_PATHS = new Set([
  "/api/intake-webhook",
  "/api/drive/callback",
]);

/**
 * Generate a cryptographically secure CSRF token
 */
function generateToken(): string {
  return randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * Securely compare two tokens
 */
function tokensMatch(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Get CSRF token from cookie
 */
function getTokenFromCookie(c: Context): string | null {
  const cookieHeader = c.req.header("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Set CSRF token cookie
 */
function setTokenCookie(c: Context, token: string): void {
  c.header(
    "Set-Cookie",
    `${CSRF_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`
  );
}

/**
 * CSRF protection middleware
 * 
 * For safe methods: ensures a CSRF token cookie exists
 * For unsafe methods: validates X-CSRF-Token header matches cookie
 */
export const csrfProtection = createMiddleware(async (c, next) => {
  const method = c.req.method.toUpperCase();
  const path = c.req.path;
  
  // Skip exempt paths (webhooks)
  if (EXEMPT_PATHS.has(path)) {
    await next();
    return;
  }
  
  // For safe methods, just ensure token exists
  if (SAFE_METHODS.has(method)) {
    let token = getTokenFromCookie(c);
    if (!token) {
      token = generateToken();
      setTokenCookie(c, token);
    }
    // Make token available for client via response header
    c.header("X-CSRF-Token", token);
    await next();
    return;
  }
  
  // For unsafe methods, validate CSRF token
  const cookieToken = getTokenFromCookie(c);
  const headerToken = c.req.header(CSRF_HEADER_NAME);
  
  if (!cookieToken || !headerToken) {
    return c.json(
      { error: "CSRF token missing. Please refresh the page and try again." },
      403
    );
  }
  
  if (!tokensMatch(cookieToken, headerToken)) {
    return c.json(
      { error: "CSRF token mismatch. Please refresh the page and try again." },
      403
    );
  }
  
  await next();
});

/**
 * Get CSRF token endpoint - returns current token for SPA to use
 */
export function getCsrfToken(c: Context): Response {
  let token = getTokenFromCookie(c);
  if (!token) {
    token = generateToken();
    setTokenCookie(c, token);
  }
  c.header("X-CSRF-Token", token);
  return c.json({ csrfToken: token });
}
