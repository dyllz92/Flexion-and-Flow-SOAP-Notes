import { createMiddleware } from "hono/factory";

/**
 * Cache Control Middleware for Static Assets
 *
 * Sets appropriate cache headers based on file type:
 * - Immutable assets (hashed): 1 year
 * - Vendor libraries: 1 week
 * - Other static: 1 day
 */

/** Cache durations in seconds */
const CACHE_DURATIONS = {
  /** Hashed/versioned files - can be cached forever */
  immutable: 31536000, // 1 year
  /** Vendor libraries - long cache */
  vendor: 604800, // 1 week
  /** Standard static assets */
  standard: 86400, // 1 day
  /** Short cache for frequently updated */
  short: 3600, // 1 hour
  /** No cache */
  none: 0,
};

/**
 * Determine cache duration based on URL/path
 */
function getCacheDuration(path: string): number {
  // Hashed files (e.g., main.abc123.js) - immutable
  if (/\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|eot)$/i.test(path)) {
    return CACHE_DURATIONS.immutable;
  }

  // Vendor directory - long cache
  if (path.includes("/vendor/")) {
    return CACHE_DURATIONS.vendor;
  }

  // Sample files - standard cache
  if (path.includes("/samples/")) {
    return CACHE_DURATIONS.standard;
  }

  // Images, fonts, and PDFs - standard cache
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|pdf)$/i.test(path)) {
    return CACHE_DURATIONS.standard;
  }

  // CSS and JS - shorter cache
  if (/\.(css|js)$/i.test(path)) {
    return CACHE_DURATIONS.short;
  }

  // Default - no cache
  return CACHE_DURATIONS.none;
}

/**
 * Static asset caching middleware
 */
export const cacheControl = createMiddleware(async (c, next) => {
  await next();

  // Only apply to successful responses
  if (c.res.status !== 200) return;

  const path = c.req.path;
  const duration = getCacheDuration(path);

  if (duration > 0) {
    const isImmutable = duration === CACHE_DURATIONS.immutable;
    const cacheValue = isImmutable
      ? `public, max-age=${duration}, immutable`
      : `public, max-age=${duration}`;

    c.header("Cache-Control", cacheValue);

    // Add ETag for conditional requests
    const etag = generateETag(path, c.res.headers.get("content-length") || "0");
    c.header("ETag", etag);
  } else {
    // No cache for dynamic content
    c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  }
});

/**
 * Generate simple ETag based on path and size
 */
function generateETag(path: string, size: string): string {
  const hash = Buffer.from(`${path}:${size}`).toString("base64").slice(0, 16);
  return `"${hash}"`;
}

/**
 * Security headers middleware
 */
export const securityHeaders = createMiddleware(async (c, next) => {
  await next();

  // Prevent clickjacking
  c.header("X-Frame-Options", "SAMEORIGIN");

  // Prevent MIME type sniffing
  c.header("X-Content-Type-Options", "nosniff");

  // XSS protection (legacy browsers)
  c.header("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy (enforced)
  c.header(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
      "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.openai.com https://www.googleapis.com https://oauth2.googleapis.com",
    ].join("; "),
  );
});
