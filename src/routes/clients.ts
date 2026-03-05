import { Hono } from "hono";
import type { ClientRecord } from "../types/index.js";
import {
  findClientByEmail,
  getClient,
  saveClient,
  generateAccountNumber,
  db,
} from "../database/index.js";

const clients = new Hono();

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
  return c.json({ success: true, client: updated });
});

export default clients;
