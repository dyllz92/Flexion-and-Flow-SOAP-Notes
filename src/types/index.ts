/**
 * Core application type definitions for SOAP Note Generator
 */

/**
 * Client record structure stored in database
 */
export interface ClientRecord {
  accountNumber: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  occupation: string;
  chiefComplaint: string;
  medications: string;
  allergies: string;
  medicalConditions: string;
  areasToAvoid: string;
  createdAt: string;
  updatedAt: string;
  intakeForms: IntakeSnapshot[];
  sessionCount: number;
  lastSessionDate: string;
  driveToken?: string; // encrypted Google Drive refresh token
}

/**
 * Intake form data snapshot saved with timestamps
 */
export interface IntakeSnapshot {
  savedAt: string;
  source: string;
  data: Record<string, string>;
}

/**
 * Complete session record with SOAP note data
 */
export interface SessionRecord {
  sessionId: string;
  accountNumber: string;
  clientName: string;
  sessionDate: string;
  duration: string;
  musclesTreated: string[];
  musclesToFollowUp: string[];
  techniques: string[];
  soapNote: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    therapistNotes: string;
  };
  intakeSnapshot: string;
  therapistName: string;
  therapistCredentials: string;
  painBefore: string;
  painAfter: string;
  chiefComplaint: string;
  savedAt: string;
  pdfDriveFileId?: string;
  pdfDriveUrl?: string;
}

/**
 * Environment configuration structure
 */
export interface AppEnvironment {
  OPENAI_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  GOOGLE_DRIVE_FOLDER_ID: string;
  ADMIN_PASSWORD: string;
  DATA_DIR: string;
  PORT: number;
  DASHBOARD_WEBHOOK_URL: string;
  WEBHOOK_SECRET: string;
  INTAKE_FORM_URL: string;
}

/**
 * Google Drive upload response
 */
export interface DriveUploadResult {
  id: string;
  webViewLink: string;
}

/**
 * Database row structure for clients table
 */
export interface ClientRow {
  account_number: string;
  id: string;
  data: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row structure for sessions table
 */
export interface SessionRow {
  session_id: string;
  account_number: string;
  session_date: string;
  data: string;
  saved_at: string;
}

/**
 * Database row structure for meta table
 */
export interface MetaRow {
  key: string;
  value: string;
}

/**
 * KV interface for meta table operations
 */
export interface KVStore {
  get(key: string): string | null;
  put(key: string, value: string): void;
  del(key: string): void;
}
