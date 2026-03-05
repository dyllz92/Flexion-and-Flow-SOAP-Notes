import { Hono } from "hono";

const intake = new Hono();

/**
 * POST /api/intake-webhook — receives structured client data from Flexion & Flow intake form
 *
 * The intake form POSTs here after a successful submission so the therapist can
 * load the client into a new SOAP session without uploading a PDF manually.
 */
intake.post("/intake-webhook", async (c) => {
  try {
    const body = await c.req.json();

    // Validate minimum required fields
    if (!body.firstName || !body.lastName) {
      return c.json({ error: "firstName and lastName are required" }, 400);
    }

    // Return the parsed profile so the browser can save it in localStorage
    const profile = {
      id: body.id || crypto.randomUUID(),
      firstName: String(body.firstName || "").trim(),
      lastName: String(body.lastName || "").trim(),
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim(),
      dob: String(body.dob || "").trim(),
      occupation: String(body.occupation || "").trim(),
      chiefComplaint: String(
        body.primaryConcern || body.chiefComplaint || "",
      ).trim(),
      painIntensity:
        body.painIntensity != null ? Number(body.painIntensity) : null,
      medications: Array.isArray(body.medications)
        ? body.medications.join(", ")
        : String(body.medications || "").trim(),
      allergies: String(body.allergies || "").trim(),
      medicalConditions: Array.isArray(body.medicalConditions)
        ? body.medicalConditions.join(", ")
        : String(body.medicalConditions || "").trim(),
      areasToAvoid: String(body.areasToAvoid || "").trim(),
      submittedAt: body.submittedAt || new Date().toISOString(),
      source: "flexion-intake-form",
    };

    return c.json({ success: true, profile });
  } catch (error) {
    console.error("Intake webhook error:", error);
    return c.json({ error: "Invalid request body" }, 400);
  }
});

export default intake;
