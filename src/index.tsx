import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { bodyLimit } from "hono/body-limit";

// Import our modular routes
import clientsRouter from "./routes/clients.js";
import sessionsRouter from "./routes/sessions.js";
import aiRouter from "./routes/ai.js";
import intakeRouter from "./routes/intake.js";
import driveRouter from "./routes/drive.js";

// Import middleware
import { csrfProtection, getCsrfToken } from "./middleware/csrf.js";
import {
  standardRateLimiter,
  aiRateLimiter,
  uploadRateLimiter,
} from "./middleware/rate-limit.js";
import { cacheControl, securityHeaders } from "./middleware/cache.js";
import { requireAuth, authRateLimit } from "./middleware/auth.js";
import { db } from "./database/index.js";
import { renderApp } from "./components/app.js";

const app = new Hono();

// Security headers for all responses
app.use("*", securityHeaders);

// Middleware
app.use("/api/*", cors());

// Request size limiting for API routes
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 10 * 1024 * 1024,
    onError: (c) =>
      c.json({ error: "Request too large. Maximum size is 10MB." }, 413),
  }),
);

// Rate limiting for API routes
app.use("/api/*", standardRateLimiter(db));

// Stricter rate limiting for expensive operations
app.use("/api/generate-soap", aiRateLimiter(db));
app.use("/api/drive/upload-pdf", uploadRateLimiter(db));
app.use("/api/drive/sync-pdfs", uploadRateLimiter(db));

// CSRF protection for API routes (excludes webhooks via middleware config)
app.use("/api/*", csrfProtection);

// CSRF token endpoint for SPA
app.get("/api/csrf-token", (c) => getCsrfToken(c));

// Auth verification endpoint for SPA login
app.post("/api/auth/verify", authRateLimit, requireAuth, (c) => {
  return c.json({ authenticated: true });
});

// Require auth for SPA-facing data routes
// (intake webhook and client export/import have their own webhook-secret auth)
app.use("/api/clients/*", async (c, next) => {
  const url = new URL(c.req.url);
  const seg = url.pathname.split("/").filter(Boolean);
  // Skip requireAuth for webhook-authenticated routes: /api/clients/export, import, sync
  const last = seg[seg.length - 1];
  if (last === "export" || last === "import" || last === "sync") {
    return next();
  }
  return requireAuth(c, next);
});
app.use("/api/clients", requireAuth);
app.use("/api/generate-soap", requireAuth);
app.use("/api/ai-status", requireAuth);
app.use("/api/drive/*", async (c, next) => {
  const url = new URL(c.req.url);
  const seg = url.pathname.split("/").filter(Boolean);
  const last = seg[seg.length - 1];
  // Skip requireAuth for OAuth flow routes
  if (last === "auth" || last === "callback") {
    return next();
  }
  return requireAuth(c, next);
});
app.use("/api/clients/:accountNumber/sessions", requireAuth);
app.use("/api/clients/:accountNumber/sessions/*", requireAuth);
app.use("/api/sessions/*", requireAuth);

// Serve static files with caching
app.use("/static/*", cacheControl, serveStatic({ root: "./public" }));
app.use("/*.png", cacheControl, serveStatic({ root: "./public" }));
app.use("/*.jpg", cacheControl, serveStatic({ root: "./public" }));
app.use("/*.ico", cacheControl, serveStatic({ root: "./public" }));
app.use("/*.svg", cacheControl, serveStatic({ root: "./public" }));

// Mount API routes
app.route("/api/clients", clientsRouter);
app.route("/api", sessionsRouter); // sessions has nested client URLs
app.route("/api", aiRouter);
app.route("/api", intakeRouter);
app.route("/api/drive", driveRouter);

// Main app - serve the SPA
app.get("/", (c) => {
  return c.html(renderApp());
});

app.get("*", (c) => {
  return c.html(renderApp());
});

export default app;
