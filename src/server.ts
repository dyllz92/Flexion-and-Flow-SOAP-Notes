import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import app from "./index.js";

const PORT = parseInt(process.env.PORT || "3000", 10);

// Serve public/ static assets via Node.js adapter
// (The Hono app also has routes for /*.png etc., but this middleware
//  is the authoritative handler for all files under public/)
app.use("/*", serveStatic({ root: "./public" }));

serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(
    `🚀 SOAP Note Generator running on http://localhost:${info.port}`,
  );
  console.log(`   Data directory: ${process.env.DATA_DIR || "./data"}`);
});
