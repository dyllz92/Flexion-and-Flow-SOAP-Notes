import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";

// Import our modular routes
import clientsRouter from "./routes/clients.js";
import sessionsRouter from "./routes/sessions.js";
import aiRouter from "./routes/ai.js";
import intakeRouter from "./routes/intake.js";
import driveRouter from "./routes/drive.js";

// Import middleware
import { csrfProtection, getCsrfToken } from "./middleware/csrf.js";
import { standardRateLimiter, aiRateLimiter, uploadRateLimiter } from "./middleware/rate-limit.js";
import { cacheControl, securityHeaders } from "./middleware/cache.js";
import { db } from "./database/index.js";

// Import original renderApp function (keeping UI intact for now)
import { renderApp } from "./components/app.js";

const app = new Hono();

// Security headers for all responses
app.use("*", securityHeaders);

// Middleware
app.use("/api/*", cors());

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
