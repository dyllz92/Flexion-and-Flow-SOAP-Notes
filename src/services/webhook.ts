import { ENV } from "../database/index.js";

/**
 * Notify the Dashboard app about a client or session event.
 * Fire-and-forget — logs errors but never throws.
 */
export async function notifyDashboard(
  eventType: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!ENV.DASHBOARD_WEBHOOK_URL || !ENV.SESSION_SECRET) return;

  try {
    const res = await fetch(ENV.DASHBOARD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": ENV.SESSION_SECRET,
      },
      body: JSON.stringify({ event: eventType, ...data }),
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
