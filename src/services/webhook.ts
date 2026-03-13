import { ENV } from "../database/index.js";

/**
 * Notify the Dashboard app about a client or session event.
 * Fire-and-forget — logs errors but never throws.
 */
export async function notifyDashboard(
  eventType: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!ENV.DASHBOARD_WEBHOOK_URL) return;

  const secret = ENV.WEBHOOK_SECRET_SOAP || ENV.SESSION_SECRET;
  if (!secret) return;

  const isSoapWebhook = /\/api\/webhook\/soap\/?$/i.test(
    ENV.DASHBOARD_WEBHOOK_URL,
  );

  // SOAP completion endpoint only expects completion payloads.
  if (isSoapWebhook && eventType !== "session_saved") return;

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
      console.error(
        `Dashboard webhook failed (${res.status}):`,
        await res.text().catch(() => ""),
      );
    }
  } catch (error) {
    console.error("Dashboard webhook error:", error);
  }
}
