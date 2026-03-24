import { Hono } from "hono";
import path from "node:path";
import fs from "node:fs";
import type { SessionRecord } from "../types/index.js";
import {
  getClient,
  saveClient,
  saveSession,
  db,
  kv,
  ENV,
} from "../database/index.js";
import { refreshGoogleToken, uploadToDrive } from "../services/google-drive.js";
import { notifyDashboard } from "../services/webhook.js";
import {
  sessionSchema,
  validateInput,
  ValidationError,
} from "../validation/schemas.js";

const sessions = new Hono();

/**
 * POST /api/clients/:accountNumber/sessions — save SOAP note
 */
sessions.post("/clients/:accountNumber/sessions", async (c) => {
  const acct = c.req.param("accountNumber");

  // Validate account number format
  if (!/^[A-Z]{2}-\d{6}-\d{4}$/.test(acct)) {
    return c.json({ error: "Invalid account number format" }, 400);
  }

  const client = getClient(acct);
  if (!client) return c.json({ error: "Client not found" }, 404);

  let body;
  try {
    const rawBody = await c.req.json();
    body = validateInput(sessionSchema, rawBody);
  } catch (err) {
    if (err instanceof ValidationError) {
      return c.json({ error: `Validation error: ${err.message}` }, 400);
    }
    return c.json({ error: "Invalid request body" }, 400);
  }

  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const session: SessionRecord = {
    sessionId,
    accountNumber: acct,
    clientName: `${client.firstName} ${client.lastName}`.trim(),
    sessionDate: body.sessionDate || now.split("T")[0],
    duration: body.duration || "",
    musclesTreated: body.musclesTreated || [],
    musclesToFollowUp: body.musclesToFollowUp || [],
    techniques: body.techniques || [],
    soapNote: body.soapNote
      ? {
          subjective: body.soapNote.subjective || "",
          objective: body.soapNote.objective || "",
          assessment: body.soapNote.assessment || "",
          plan: body.soapNote.plan || "",
          therapistNotes: body.soapNote.therapistNotes || "",
        }
      : {
          subjective: "",
          objective: "",
          assessment: "",
          plan: "",
          therapistNotes: "",
        },
    intakeSnapshot: body.intakeSnapshot || "",
    therapistName: body.therapistName || "",
    therapistCredentials: body.therapistCredentials || "",
    painBefore: body.painBefore?.toString() || "",
    painAfter: body.painAfter?.toString() || "",
    chiefComplaint: body.chiefComplaint || "",
    savedAt: now,
  };

  saveSession(session);

  // Update client record with session count
  client.sessionCount = (client.sessionCount || 0) + 1;
  client.lastSessionDate = session.sessionDate;
  client.updatedAt = now;
  saveClient(client);

  // Write JSON backup file to DATA_DIR
  const backupPath = path.join(
    ENV.DATA_DIR,
    `session_${acct}_${sessionId.slice(0, 8)}.json`,
  );
  try {
    fs.writeFileSync(backupPath, JSON.stringify(session, null, 2));
  } catch (error) {
    console.error("Failed to write backup file:", error);
  }

  // Try Drive JSON upload if token exists
  const driveToken = kv.get("global_drive_refresh_token");
  if (driveToken && ENV.GOOGLE_CLIENT_ID) {
    refreshGoogleToken(
      driveToken,
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
    )
      .then((accessToken) => {
        if (accessToken) {
          uploadToDrive(
            accessToken,
            ENV.GOOGLE_DRIVE_FOLDER_ID,
            `SOAP_${acct}_${session.sessionDate}_${sessionId.slice(0, 8)}.json`,
            JSON.stringify(session, null, 2),
            "application/json",
          );
        }
      })
      .catch((error) => console.error("Drive upload error:", error));
  }

  // Notify Dashboard about new session (fire-and-forget, but store returned clientId)
  notifyDashboard("session_saved", {
    submissionId: body.submissionId || body.sourceSubmissionId || null,
    taskId: body.taskId || null,
    accountNumber: acct,
    sessionId,
    clientName: session.clientName,
    clientEmail: client.email,
    sessionDate: session.sessionDate,
    completedAt: now,
    noteUrl: body.noteUrl || null,
  })
    .then((resp) => {
      if (resp?.clientId && !client.dashboardClientId) {
        client.dashboardClientId = resp.clientId;
        saveClient(client);
      }
    })
    .catch(() => {});

  return c.json({ success: true, sessionId, session });
});

/**
 * GET /api/clients/:accountNumber/sessions — list sessions for client
 */
sessions.get("/clients/:accountNumber/sessions", (c) => {
  const acct = c.req.param("accountNumber");
  const rows = db
    .prepare(
      `
    SELECT data FROM sessions WHERE account_number = ? ORDER BY session_date DESC LIMIT 100
  `,
    )
    .all(acct) as { data: string }[];

  const sessions = rows
    .map((r) => {
      try {
        return JSON.parse(r.data) as SessionRecord;
      } catch (error) {
        console.error("Failed to parse session data:", error);
        return null;
      }
    })
    .filter(Boolean);

  return c.json({ sessions });
});

/**
 * GET /api/sessions/:sessionId — get single session by ID
 */
sessions.get("/sessions/:sessionId", (c) => {
  const row = db
    .prepare("SELECT data FROM sessions WHERE session_id = ?")
    .get(c.req.param("sessionId")) as { data: string } | undefined;

  if (!row) return c.json({ error: "Session not found" }, 404);

  try {
    const session = JSON.parse(row.data) as SessionRecord;
    return c.json(session);
  } catch (error) {
    console.error("Failed to parse session data:", error);
    return c.json({ error: "Invalid session data" }, 500);
  }
});

export default sessions;
