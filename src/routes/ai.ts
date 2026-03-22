import { Hono } from "hono";
import { ENV } from "../database/index.js";
import {
  soapGenerateSchema,
  validateInput,
  ValidationError,
} from "../validation/schemas.js";

const ai = new Hono();

/** Default timeout for external API calls (30 seconds) */
const API_TIMEOUT_MS = 30000;

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * GET /api/ai-status — Check if OpenAI API key is configured
 */
ai.get("/ai-status", (c) => {
  const configured = !!ENV.OPENAI_API_KEY;
  return c.json({ configured });
});

/**
 * Build SOAP prompt for OpenAI (now optional, if client sends full prompt)
 */
function buildSOAPPrompt(
  muscles: string[],
  sessionSummary: string,
  intakeData: string,
): string {
  const muscleList =
    muscles?.length > 0 ? muscles.join(", ") : "No specific muscles recorded";

  return `Generate a complete SOAP note for a massage therapy session. Return a JSON object with keys: "subjective", "objective", "assessment", "plan", "therapistNotes".

CLIENT INTAKE INFORMATION:
${intakeData || "No intake form provided"}

MUSCLES TREATED / REQUIRING FOLLOW-UP:
${muscleList}

THERAPIST SESSION SUMMARY:
${sessionSummary || "No summary provided"}

Return JSON with these exact keys:
- "subjective": Patient-reported complaints, pain levels (use NRS 0-10 scale if mentioned), history, and goals. 2-4 sentences.
- "objective": Observable/measurable findings including palpation findings for the listed muscles, range of motion, tissue texture, and postural observations. 3-5 sentences.
- "assessment": Clinical interpretation of findings, tissue response, progress toward goals, and clinical reasoning. 2-4 sentences.
- "plan": Treatment plan including frequency, home care recommendations, areas to focus on next session, and self-care advice. 3-5 sentences.
- "therapistNotes": Any additional clinical notes, contraindications observed, or special considerations. 1-3 sentences.`;
}

/**
 * POST /api/generate-soap — Generate SOAP notes via OpenAI
 */
ai.post("/generate-soap", async (c) => {
  const apiKey = ENV.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "OpenAI API key not configured" }, 500);
  }

  try {
    const rawBody = await c.req.json();

    // Validate input
    let validated;
    try {
      validated = validateInput(soapGenerateSchema, rawBody);
    } catch (err) {
      if (err instanceof ValidationError) {
        return c.json({ error: `Validation error: ${err.message}` }, 400);
      }
      throw err;
    }

    const { muscles, sessionSummary, intakeData, prompt: clientPrompt } = validated;

    // Use client-generated prompt if available, otherwise build it
    const prompt =
      clientPrompt || buildSOAPPrompt(muscles || [], sessionSummary || "", intakeData || "");

    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert massage therapist and clinical documentation specialist. Generate professional SOAP notes in a structured JSON format based on the provided session information. Use clinical terminology appropriate for massage therapy.`,
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      },
      API_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return c.json({ error: `OpenAI error: ${errorText}` }, 500);
    }

    const data: any = await response.json();
    
    // Safely parse response
    if (!data?.choices?.[0]?.message?.content) {
      console.error("Unexpected OpenAI response structure:", data);
      return c.json({ error: "Invalid response from OpenAI" }, 500);
    }
    
    const content = JSON.parse(data.choices[0].message.content);
    return c.json(content);
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("OpenAI API timeout");
      return c.json({ error: "AI service timeout - please try again" }, 504);
    }
    console.error("SOAP generation error:", error);
    return c.json({ error: "Failed to generate SOAP note" }, 500);
  }
});

export default ai;
