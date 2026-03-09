import { Hono } from "hono";
import type { ClientRecord } from "../types/index.js";
import {
  findClientByEmail,
  saveClient,
  generateAccountNumber,
} from "../database/index.js";
import { notifyDashboard } from "../services/webhook.js";

const intake = new Hono();

/**
 * POST /api/intake-webhook — receives structured client data from Flexion & Flow intake form.
 * Persists client to SQLite (upsert by email), forwards to Dashboard, and returns the profile.
 */
intake.post("/intake-webhook", async (c) => {
  try {
    const body = await c.req.json();

    // Validate minimum required fields
    if (!body.firstName || !body.lastName) {
      return c.json({ error: "firstName and lastName are required" }, 400);
    }

    const now = new Date().toISOString();
    const email = String(body.email || "")
      .toLowerCase()
      .trim();

    // Parse profile fields
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const phone = String(body.phone || "").trim();
    const dob = String(body.dob || "").trim();
    const occupation = String(body.occupation || "").trim();
    const chiefComplaint = String(
      body.primaryConcern || body.chiefComplaint || "",
    ).trim();
    const medications = Array.isArray(body.medications)
      ? body.medications.join(", ")
      : String(body.medications || "").trim();
    const allergies = String(body.allergies || "").trim();
    const medicalConditions = Array.isArray(body.medicalConditions)
      ? body.medicalConditions.join(", ")
      : String(body.medicalConditions || "").trim();
    const areasToAvoid = String(body.areasToAvoid || "").trim();

    const intakeSnapshot = {
      savedAt: now,
      source: "flexion-intake-form",
      data: {
        painIntensity:
          body.painIntensity != null ? String(body.painIntensity) : "",
        redFlags: String(body.redFlags || ""),
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
