import { ENV } from "../database/index.js";

/**
 * Response from Dashboard webhook containing linked client ID
 */
export interface DashboardWebhookResponse {
  success: boolean;
  clientId?: number;
  taskId?: number;
  submissionId?: string;
}

/**
 * Notify the Dashboard app about a client or session event.
 * Fire-and-forget — logs errors but never throws.
 * Returns the Dashboard response (with clientId) if available.
 */
export async function notifyDashboard(
  eventType: string,
  data: Record<string, unknown>,
): Promise<DashboardWebhookResponse | null> {
  if (!ENV.DASHBOARD_WEBHOOK_URL) return null;

  const secret = ENV.WEBHOOK_SECRET_SOAP;
  if (!secret) {
    console.error(
      "DASHBOARD_WEBHOOK_URL is configured but WEBHOOK_SECRET_SOAP is missing.",
    );
    return null;
  }

  const isSoapWebhook = /\/api\/webhook\/soap\/?$/i.test(
    ENV.DASHBOARD_WEBHOOK_URL,
  );

  // SOAP completion endpoint only expects completion payloads.
  if (isSoapWebhook && eventType !== "session_saved") return null;

  const payload = isSoapWebhook
    ? {
        submissionId: (data.submissionId as string) || null,
        taskId: (data.taskId as number | string) || null,
        clientName: (data.clientName as string) || null,
        clientEmail: (data.clientEmail as string) || null,
        completedAt: (data.completedAt as string) || new Date().toISOString(),
        soapNoteId:
          (data.soapNoteId as string) || (data.sessionId as string) || null,
        noteUrl: (data.noteUrl as string) || null,
        status: "completed",
        accountNumber: (data.accountNumber as string) || null,
      }
    : { event: eventType, ...data };

  try {
    const res = await fetch(ENV.DASHBOARD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": secret,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const responseText = await res.text().catch(() => "");
      console.error(
        `Dashboard webhook failed for ${eventType} (${res.status}):`,
        responseText,
      );
      return null;
    }

    const body = (await res
      .json()
      .catch(() => null)) as DashboardWebhookResponse | null;
    return body;
  } catch (error) {
    console.error(`Dashboard webhook error for ${eventType}:`, error);
    return null;
  }
}
