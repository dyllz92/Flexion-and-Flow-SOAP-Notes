import { Hono } from "hono";
import type { ClientRecord } from "../types/index.js";
import {
  findClientByEmail,
  getClient,
  saveClient,
  generateAccountNumber,
  db,
  ENV,
} from "../database/index.js";
import { notifyDashboard } from "../services/webhook.js";
import { requireAuth, authRateLimit } from "../middleware/auth.js";

const clients = new Hono();

// Apply authentication to all client routes except public intake
clients.use("/*", authRateLimit);
clients.use("/", requireAuth); // Protect client creation
clients.use("/:accountNum/*", requireAuth); // Protect client access

/**
 * POST /api/clients — create or upsert client, returns accountNumber
 */
clients.post("/", async (c) => {
  const body = (await c.req.json()) as Partial<ClientRecord> & {
    source?: string;
    intakeData?: Record<string, string>;
  };

  if (!body.firstName && !body.lastName) {
    return c.json({ error: "Name required" }, 400);
  }

  const email = (body.email || "").toLowerCase().trim();
  let existing: ClientRecord | null = null;
  if (email) existing = findClientByEmail(email);

  const now = new Date().toISOString();

  if (existing) {
    // Update existing client with new intake data
    const intakeEntry = {
      savedAt: now,
      source: body.source || "soap-generator",
      data: body.intakeData || {},
    };

    existing.updatedAt = now;
    existing.firstName = body.firstName || existing.firstName;
    existing.lastName = body.lastName || existing.lastName;
    existing.phone = body.phone || existing.phone;
    existing.dob = body.dob || existing.dob;
    existing.occupation = body.occupation || existing.occupation;
    existing.chiefComplaint = body.chiefComplaint || existing.chiefComplaint;
    existing.medications = body.medications || existing.medications;
    existing.allergies = body.allergies || existing.allergies;
    existing.medicalConditions =
      body.medicalConditions || existing.medicalConditions;
    existing.areasToAvoid = body.areasToAvoid || existing.areasToAvoid;
    existing.intakeForms = [...(existing.intakeForms || []), intakeEntry];

    saveClient(existing);

    notifyDashboard("client_updated", {
      accountNumber: existing.accountNumber,
      clientName: `${existing.firstName} ${existing.lastName}`.trim(),
      clientEmail: existing.email,
    });

    return c.json({
      success: true,
      accountNumber: existing.accountNumber,
      client: existing,
      isNew: false,
    });
  }

  // Create new client
  const accountNumber = generateAccountNumber();
  const id = body.id || crypto.randomUUID();

  const client: ClientRecord = {
    accountNumber,
    id,
    firstName: body.firstName || "",
    lastName: body.lastName || "",
    email,
    phone: body.phone || "",
    dob: body.dob || "",
    occupation: body.occupation || "",
    chiefComplaint: body.chiefComplaint || "",
    medications: body.medications || "",
    allergies: body.allergies || "",
    medicalConditions: body.medicalConditions || "",
    areasToAvoid: body.areasToAvoid || "",
    createdAt: now,
    updatedAt: now,
    intakeForms: [
      {
        savedAt: now,
        source: body.source || "soap-generator",
        data: body.intakeData || {},
      },
    ],
    sessionCount: 0,
    lastSessionDate: "",
  };

  saveClient(client);

  notifyDashboard("client_created", {
    accountNumber: client.accountNumber,
    clientName: `${client.firstName} ${client.lastName}`.trim(),
    clientEmail: client.email,
  });

  return c.json({ success: true, accountNumber, client, isNew: true }, 201);
});

/**
 * GET /api/clients — list all clients (summary)
 */
clients.get("/", (c) => {
  const rows = db
    .prepare(
      `
    SELECT data FROM clients ORDER BY updated_at DESC LIMIT 500
  `,
    )
    .all() as { data: string }[];

  const clients = rows
    .map((r) => {
      try {
        const client: ClientRecord = JSON.parse(r.data);
        return {
          accountNumber: client.accountNumber,
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          dob: client.dob,
          chiefComplaint: client.chiefComplaint,
          sessionCount: client.sessionCount,
          lastSessionDate: client.lastSessionDate,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
        };
      } catch (error) {
        console.error("Failed to parse client data:", error);
        return null;
      }
    })
    .filter(Boolean);

  return c.json({ clients });
});

/**
 * GET /api/clients/export — export all clients (authenticated via webhook secret)
 */
clients.get("/export", (c) => {
  const secret = c.req.header("X-Webhook-Secret");
  if (!ENV.SESSION_SECRET || secret !== ENV.SESSION_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const rows = db
    .prepare("SELECT data FROM clients ORDER BY updated_at DESC")
    .all() as { data: string }[];

  const clients = rows
    .map((r) => {
      try {
        const client: ClientRecord = JSON.parse(r.data);
        // Strip driveToken for security
        const { driveToken, ...safe } = client;
        return safe;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return c.json({ clients, exportedAt: new Date().toISOString() });
});

/**
 * POST /api/clients/import — bulk import/upsert clients (authenticated via webhook secret)
 */
clients.post("/import", async (c) => {
  const secret = c.req.header("X-Webhook-Secret");
  if (!ENV.SESSION_SECRET || secret !== ENV.SESSION_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const incoming = body.clients as Partial<ClientRecord>[];
  if (!Array.isArray(incoming)) {
    return c.json({ error: "clients array required" }, 400);
  }

  let created = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const item of incoming) {
    const email = (item.email || "").toLowerCase().trim();
    let existing: ClientRecord | null = null;
    if (email) existing = findClientByEmail(email);

    if (existing) {
      // Only update if incoming data is newer
      if (item.updatedAt && item.updatedAt > (existing.updatedAt || "")) {
        existing.firstName = item.firstName || existing.firstName;
        existing.lastName = item.lastName || existing.lastName;
        existing.phone = item.phone || existing.phone;
        existing.dob = item.dob || existing.dob;
        existing.occupation = item.occupation || existing.occupation;
        existing.chiefComplaint =
          item.chiefComplaint || existing.chiefComplaint;
        existing.medications = item.medications || existing.medications;
        existing.allergies = item.allergies || existing.allergies;
        existing.medicalConditions =
          item.medicalConditions || existing.medicalConditions;
        existing.areasToAvoid = item.areasToAvoid || existing.areasToAvoid;
        existing.updatedAt = now;
        saveClient(existing);
        updated++;
      }
    } else if (item.firstName || item.lastName) {
      const client: ClientRecord = {
        accountNumber: item.accountNumber || generateAccountNumber(),
        id: item.id || crypto.randomUUID(),
        firstName: item.firstName || "",
        lastName: item.lastName || "",
        email,
        phone: item.phone || "",
        dob: item.dob || "",
        occupation: item.occupation || "",
        chiefComplaint: item.chiefComplaint || "",
        medications: item.medications || "",
        allergies: item.allergies || "",
        medicalConditions: item.medicalConditions || "",
        areasToAvoid: item.areasToAvoid || "",
        createdAt: item.createdAt || now,
        updatedAt: now,
        intakeForms: item.intakeForms || [],
        sessionCount: item.sessionCount || 0,
        lastSessionDate: item.lastSessionDate || "",
      };
      saveClient(client);
      created++;
    }
  }

  return c.json({ success: true, created, updated });
});

/**
 * POST /api/clients/sync — pull clients from Intake Form app (if configured)
 */
clients.post("/sync", async (c) => {
  if (!ENV.INTAKE_FORM_URL) {
    return c.json({ success: false, error: "INTAKE_FORM_URL not configured" });
  }

  try {
    const url = ENV.INTAKE_FORM_URL.replace(/\/$/, "") + "/api/clients/export";
    const res = await fetch(url, {
      headers: {
        "X-Webhook-Secret": ENV.SESSION_SECRET,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return c.json({ success: false, error: `Remote returned ${res.status}` });
    }

    const data = (await res.json()) as { clients?: Partial<ClientRecord>[] };
    const incoming = data.clients || [];
    let created = 0;
    let updated = 0;
    const now = new Date().toISOString();

    for (const item of incoming) {
      const email = (item.email || "").toLowerCase().trim();
      let existing: ClientRecord | null = null;
      if (email) existing = findClientByEmail(email);

      if (existing) {
        if (item.updatedAt && item.updatedAt > (existing.updatedAt || "")) {
          existing.firstName = item.firstName || existing.firstName;
          existing.lastName = item.lastName || existing.lastName;
          existing.phone = item.phone || existing.phone;
          existing.dob = item.dob || existing.dob;
          existing.occupation = item.occupation || existing.occupation;
          existing.chiefComplaint =
            item.chiefComplaint || existing.chiefComplaint;
          existing.medications = item.medications || existing.medications;
          existing.allergies = item.allergies || existing.allergies;
          existing.medicalConditions =
            item.medicalConditions || existing.medicalConditions;
          existing.areasToAvoid = item.areasToAvoid || existing.areasToAvoid;
          existing.updatedAt = now;
          saveClient(existing);
          updated++;
        }
      } else if (item.firstName || item.lastName) {
        const client: ClientRecord = {
          accountNumber: item.accountNumber || generateAccountNumber(),
          id: item.id || crypto.randomUUID(),
          firstName: item.firstName || "",
          lastName: item.lastName || "",
          email,
          phone: item.phone || "",
          dob: item.dob || "",
          occupation: item.occupation || "",
          chiefComplaint: item.chiefComplaint || "",
          medications: item.medications || "",
          allergies: item.allergies || "",
          medicalConditions: item.medicalConditions || "",
          areasToAvoid: item.areasToAvoid || "",
          createdAt: item.createdAt || now,
          updatedAt: now,
          intakeForms: item.intakeForms || [],
          sessionCount: item.sessionCount || 0,
          lastSessionDate: item.lastSessionDate || "",
        };
        saveClient(client);
        created++;
      }
    }

    return c.json({ success: true, created, updated, total: incoming.length });
  } catch (error) {
    console.error("Client sync error:", error);
    return c.json({ success: false, error: "Failed to fetch from intake app" });
  }
});

/**
 * GET /api/clients/:accountNumber — full client record
 */
clients.get("/:accountNumber", (c) => {
  const client = getClient(c.req.param("accountNumber"));
  if (!client) return c.json({ error: "Client not found" }, 404);
  return c.json(client);
});

/**
 * PUT /api/clients/:accountNumber — update client details
 */
clients.put("/:accountNumber", async (c) => {
  const acct = c.req.param("accountNumber");
  const existing = getClient(acct);
  if (!existing) return c.json({ error: "Client not found" }, 404);

  const body = await c.req.json();
  const updated: ClientRecord = {
    ...existing,
    ...body,
    accountNumber: acct,
    updatedAt: new Date().toISOString(),
  };

  saveClient(updated);

  notifyDashboard("client_updated", {
    accountNumber: acct,
    clientName: `${updated.firstName} ${updated.lastName}`.trim(),
    clientEmail: updated.email,
  });

  return c.json({ success: true, client: updated });
});

export default clients;
