import { Hono } from "hono";
import { ENV } from "../database/index.js";

const ai = new Hono();

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
  const intakeInfo = intakeData || "No intake form provided";

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
    const body = await c.req.json();
    const { muscles, sessionSummary, intakeData, prompt: clientPrompt } = body; // Accept client-generated prompt

    // Use client-generated prompt if available, otherwise build it
    const prompt =
      clientPrompt || buildSOAPPrompt(muscles, sessionSummary, intakeData);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
        response_format: { type: "json_object" }, // Ensure JSON output
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return c.json({ error: `OpenAI error: ${errorText}` }, 500);
    }

    const data: any = await response.json(); // Raw response from OpenAI
    const content = JSON.parse(data.choices[0].message.content); // Parse the content string
    return c.json(content); // Return the parsed JSON object
  } catch (error) {
    console.error("SOAP generation error:", error);
    return c.json({ error: "Failed to generate SOAP note" }, 500);
  }
});

export default ai;
