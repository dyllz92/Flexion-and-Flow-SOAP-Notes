/**
 * Security Audit Logging Utility
 *
 * Logs security-related events for monitoring and compliance
 */

export interface AuditEvent {
  timestamp: string;
  level: "info" | "warn" | "error" | "critical";
  event: string;
  details: Record<string, any>;
  userIP?: string;
  userAgent?: string;
  sessionId?: string;
}

/**
 * Sanitize sensitive data before logging
 */
function sanitizeForLog(details: Record<string, any>): Record<string, any> {
  const sensitive = ["password", "token", "secret", "key", "auth"];
  const sanitized = { ...details };

  for (const key of Object.keys(sanitized)) {
    if (sensitive.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return sanitized;
}

/**
 * Log security audit event
 * Non-blocking - errors in logging won't affect main operation
 */
export async function logSecurityEvent(
  level: AuditEvent["level"],
  event: string,
  details: Record<string, any>,
  context?: {
    userIP?: string;
    userAgent?: string;
    sessionId?: string;
  },
): Promise<void> {
  try {
    const auditEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      level,
      event,
      details,
      ...context,
    };

    // For now, log to console - in production, send to centralized logging
    const logLevel =
      level === "critical" || level === "error"
        ? "error"
        : level === "warn"
          ? "warn"
          : "info";

    console[logLevel](`[AUDIT] ${event}`, {
      ...auditEvent,
      // Sanitize sensitive data from logs
      details: sanitizeForLog(details),
    });

    // TODO: In production, send to centralized logging system
    // await sendToLogService(auditEvent);
  } catch (error) {
    // Never throw from audit logging
    console.error("Audit logging failed:", error);
  }
}

/**
 * Common audit event types
 */
export const AUDIT_EVENTS = {
  // Authentication events
  AUTH_SUCCESS: "auth.success",
  AUTH_FAILED: "auth.failed",
  AUTH_BLOCKED: "auth.blocked",

  // Data access events
  CLIENT_CREATED: "client.created",
  CLIENT_UPDATED: "client.updated",
  SESSION_SAVED: "session.saved",

  // Security events
  INTAKE_WEBHOOK_UNAUTHORIZED: "webhook.intake.unauthorized",
  PROMPT_INJECTION_BLOCKED: "ai.prompt_injection.blocked",
  INAPPROPRIATE_CONTENT_BLOCKED: "ai.inappropriate_content.blocked",
  RATE_LIMIT_EXCEEDED: "rate_limit.exceeded",
  AI_USAGE_LIMIT_EXCEEDED: "ai.usage_limit.exceeded",

  // System events
  ENCRYPTION_KEY_MISSING: "system.encryption_key.missing",
  DATABASE_ERROR: "database.error",
} as const;
