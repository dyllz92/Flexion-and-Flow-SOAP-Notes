import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import type { ClientRecord } from "../types/index.js";
import {
  findClientByEmail,
  saveClient,
  generateAccountNumber,
  ENV,
} from "../database/index.js";
import { notifyDashboard } from "../services/webhook.js";
import {
  intakeWebhookSchema,
  validateInput,
  ValidationError,
} from "../validation/schemas.js";
import { logSecurityEvent, AUDIT_EVENTS } from "../utils/audit.js";

const intake = new Hono();

/**
 * POST /api/intake-webhook — receives structured client data from Flexion & Flow intake form.
 * Persists client to SQLite (upsert by email), forwards to Dashboard, and returns the profile.
 *
 * SECURITY: Validates webhook secret to prevent unauthorized data injection
 */
intake.post("/intake-webhook", async (c) => {
  const userIP =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  // Validate webhook secret for security
  const secret = process.env.WEBHOOK_SECRET_INTAKE || ENV.SESSION_SECRET;
  const providedSecret = c.req.header("X-Webhook-Secret");

  if (!secret) {
    console.error("WEBHOOK_SECRET_INTAKE not configured");
    await logSecurityEvent("critical", AUDIT_EVENTS.ENCRYPTION_KEY_MISSING, {
      context: "intake_webhook_secret",
    });
    return c.json({ error: "Webhook not configured" }, 500);
  }

  if (!providedSecret) {
    await logSecurityEvent(
      "warn",
      AUDIT_EVENTS.INTAKE_WEBHOOK_UNAUTHORIZED,
      {
        reason: "missing_secret",
      },
      { userIP },
    );
    return c.json({ error: "Missing webhook secret" }, 401);
  }

  // Timing-safe comparison to prevent timing attacks
  if (!timingSafeEqual(Buffer.from(secret), Buffer.from(providedSecret))) {
    await logSecurityEvent(
      "warn",
      AUDIT_EVENTS.INTAKE_WEBHOOK_UNAUTHORIZED,
      {
        reason: "invalid_secret",
      },
      { userIP },
    );
    return c.json({ error: "Invalid webhook secret" }, 401);
  }
  try {
    const rawBody = await c.req.json();

    // Validate input
    let body;
    try {
      body = validateInput(intakeWebhookSchema, rawBody);
    } catch (err) {
      if (err instanceof ValidationError) {
        return c.json({ error: `Validation error: ${err.message}` }, 400);
      }
      return c.json({ error: "Invalid request body" }, 400);
    }

    const now = new Date().toISOString();
    const email = (body.email || "").toLowerCase().trim();

    // Parse profile fields (already validated and sanitized)
    const firstName = body.firstName || "";
    const lastName = body.lastName || "";
    const phone = body.phone || "";
    const dob = body.dob || "";
    const occupation = body.occupation || "";
    const chiefComplaint = body.primaryConcern || body.chiefComplaint || "";
    const medications = Array.isArray(body.medications)
      ? body.medications.join(", ")
      : body.medications || "";
    const allergies = body.allergies || "";
    const medicalConditions = Array.isArray(body.medicalConditions)
      ? body.medicalConditions.join(", ")
      : body.medicalConditions || "";
    const areasToAvoid = body.areasToAvoid || "";

    const intakeSnapshot = {
      savedAt: now,
      source: "flexion-intake-form",
      data: {
        painIntensity:
          body.painIntensity != null ? String(body.painIntensity) : "",
        redFlags: body.redFlags || "",
        submittedAt: body.submittedAt || now,
      },
    };

    // Upsert: find existing client by email or create new
    let existing: ClientRecord | null = null;
    if (email) existing = findClientByEmail(email);

    let client: ClientRecord;
    let isNew = false;

    if (existing) {
      existing.firstName = firstName || existing.firstName;
      existing.lastName = lastName || existing.lastName;
      existing.phone = phone || existing.phone;
      existing.dob = dob || existing.dob;
      existing.occupation = occupation || existing.occupation;
      existing.chiefComplaint = chiefComplaint || existing.chiefComplaint;
      existing.medications = medications || existing.medications;
      existing.allergies = allergies || existing.allergies;
      existing.medicalConditions =
        medicalConditions || existing.medicalConditions;
      existing.areasToAvoid = areasToAvoid || existing.areasToAvoid;
      existing.intakeForms = [...(existing.intakeForms || []), intakeSnapshot];
      existing.updatedAt = now;
      saveClient(existing);
      client = existing;
    } else {
      isNew = true;
      client = {
        accountNumber: generateAccountNumber(),
        id: body.id || crypto.randomUUID(),
        firstName,
        lastName,
        email,
        phone,
        dob,
        occupation,
        chiefComplaint,
        medications,
        allergies,
        medicalConditions,
        areasToAvoid,
        createdAt: now,
        updatedAt: now,
        intakeForms: [intakeSnapshot],
        sessionCount: 0,
        lastSessionDate: "",
      };
      saveClient(client);
    }

    // Forward to Dashboard (fire-and-forget)
    notifyDashboard("intake_received", {
      submissionId: body.id || client.id,
      clientName: `${client.firstName} ${client.lastName}`.trim(),
      clientEmail: client.email,
      clientPhone: client.phone,
      intakeDate: now,
      accountNumber: client.accountNumber,
    });

    return c.json({
      success: true,
      accountNumber: client.accountNumber,
      isNew,
      profile: {
        ...client,
        painIntensity:
          body.painIntensity != null ? Number(body.painIntensity) : null,
        source: "flexion-intake-form",
      },
    });
  } catch (error) {
    console.error("Intake webhook error:", error);
    return c.json({ error: "Invalid request body" }, 400);
  }
});

export default intake;
