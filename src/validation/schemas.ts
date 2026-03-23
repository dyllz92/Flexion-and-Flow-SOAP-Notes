import { z } from "zod";

/**
 * Shared validation schemas for SOAP Notes application
 */

// Sanitize string - trim and limit length
const sanitizedString = (maxLength = 500) =>
  z.string().trim().max(maxLength, `Maximum ${maxLength} characters allowed`);

// Optional sanitized string
const optionalString = (maxLength = 500) =>
  sanitizedString(maxLength).optional().or(z.literal(""));

// Email validation
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email format")
  .max(254)
  .optional()
  .or(z.literal(""));

// Phone validation (loose - allows international formats)
const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[\d\s\-+().]*$/, "Invalid phone format")
  .optional()
  .or(z.literal(""));

// Date validation (ISO format or empty)
const dateSchema = z
  .string()
  .trim()
  .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date format")
  .optional()
  .or(z.literal(""));

// Pain level (0-10)
const painLevelSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (val === "" ? null : Number(val)))
  .refine(
    (val) => val === null || (val >= 0 && val <= 10),
    "Pain level must be between 0 and 10",
  )
  .optional();

/**
 * Client creation/update schema
 */
export const clientSchema = z.object({
  firstName: sanitizedString(100).min(1, "First name is required"),
  lastName: sanitizedString(100).min(1, "Last name is required"),
  email: emailSchema,
  phone: phoneSchema,
  dob: dateSchema,
  occupation: optionalString(200),
  chiefComplaint: optionalString(1000),
  medications: optionalString(1000),
  allergies: optionalString(500),
  medicalConditions: optionalString(1000),
  areasToAvoid: optionalString(500),
  // Optional fields for intake webhook
  id: z.string().uuid().optional(),
  source: optionalString(100),
  intakeData: z.record(z.string(), z.string()).optional(),
  primaryConcern: optionalString(1000),
  painIntensity: painLevelSchema,
});

export type ClientInput = z.infer<typeof clientSchema>;

/**
 * Client update schema (all fields optional except what's being updated)
 */
export const clientUpdateSchema = clientSchema.partial();

/**
 * Session/SOAP note schema
 */
export const sessionSchema = z.object({
  sessionDate: dateSchema,
  duration: z
    .string()
    .regex(/^\d+\s*(min|hour|hr)s?$/i, "Invalid duration format")
    .optional()
    .or(z.literal("")),
  musclesTreated: z.array(sanitizedString(100)).max(50).optional(),
  musclesToFollowUp: z.array(sanitizedString(100)).max(50).optional(),
  techniques: z.array(sanitizedString(100)).max(20).optional(),
  soapNote: z
    .object({
      subjective: optionalString(5000),
      objective: optionalString(5000),
      assessment: optionalString(5000),
      plan: optionalString(5000),
      therapistNotes: optionalString(2000),
    })
    .optional(),
  intakeSnapshot: optionalString(10000),
  therapistName: optionalString(200),
  therapistCredentials: optionalString(100),
  painBefore: painLevelSchema,
  painAfter: painLevelSchema,
  chiefComplaint: optionalString(1000),
  // Webhook-related optional fields
  submissionId: optionalString(100),
  sourceSubmissionId: optionalString(100),
  taskId: z.union([z.string(), z.number()]).optional(),
  noteUrl: z.string().url().optional().or(z.literal("")),
});

export type SessionInput = z.infer<typeof sessionSchema>;

/**
 * SOAP generation request schema
 */
export const soapGenerateSchema = z.object({
  muscles: z.array(sanitizedString(100)).max(50).optional(),
  sessionSummary: optionalString(5000),
  intakeData: optionalString(10000),
  prompt: optionalString(15000),
});

export type SoapGenerateInput = z.infer<typeof soapGenerateSchema>;

/**
 * Drive PDF upload schema
 */
export const drivePdfUploadSchema = z.object({
  sessionId: z.string().uuid(),
  accountNumber: sanitizedString(50),
  filename: sanitizedString(255).regex(
    /^[\w\-. ]+\.pdf$/i,
    "Invalid PDF filename",
  ),
  pdfBase64: z
    .string()
    .min(1, "PDF data required")
    .max(50 * 1024 * 1024, "PDF too large (max 50MB)"),
});

export type DrivePdfUploadInput = z.infer<typeof drivePdfUploadSchema>;

/**
 * Intake webhook schema (flexible for external sources)
 */
export const intakeWebhookSchema = z
  .object({
    firstName: sanitizedString(100),
    lastName: sanitizedString(100),
    email: emailSchema,
    phone: phoneSchema,
    dob: dateSchema,
    occupation: optionalString(200),
    primaryConcern: optionalString(1000),
    chiefComplaint: optionalString(1000),
    medications: z.union([z.string(), z.array(z.string())]).optional(),
    allergies: optionalString(500),
    medicalConditions: z.union([z.string(), z.array(z.string())]).optional(),
    areasToAvoid: optionalString(500),
    painIntensity: painLevelSchema,
    redFlags: optionalString(500),
    submittedAt: dateSchema,
    id: z.string().optional(),
  })
  .refine((data) => data.firstName || data.lastName, {
    message: "At least firstName or lastName is required",
  });

export type IntakeWebhookInput = z.infer<typeof intakeWebhookSchema>;

/**
 * Client import schema (for bulk imports)
 */
export const clientImportSchema = z.object({
  clients: z
    .array(clientUpdateSchema)
    .max(1000, "Maximum 1000 clients per import"),
});

/**
 * Validation helper - returns parsed data or throws formatted error
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue: z.ZodIssue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new ValidationError(errors);
  }
  return result.data;
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
