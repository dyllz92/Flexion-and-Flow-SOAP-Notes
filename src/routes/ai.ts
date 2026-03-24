import { Hono } from "hono";
import { ENV } from "../database/index.js";
import {
  soapGenerateSchema,
  validateInput,
  ValidationError,
} from "../validation/schemas.js";
import { logSecurityEvent, AUDIT_EVENTS } from "../utils/audit.js";

const ai = new Hono();

/** Default timeout for external API calls (30 seconds) */
const API_TIMEOUT_MS = 30000;

/** Prompt injection patterns to detect and block */
const DANGEROUS_PATTERNS = [
  /ignore.{1,20}(previous|above|system)/i,
  /forget.{1,20}(instructions|prompt|rules)/i,
  /new.{1,20}(instructions|prompt|task)/i,
  /act.{1,20}as.{1,20}(different|another)/i,
  /pretend.{1,20}(to be|you are)/i,
  />\s*[a-z_]+\s*:/i, // JSON injection attempts
  /{\s*["'][a-z_]+["']\s*:/i, // Direct JSON object injection
  /\\n\\n###/i, // Common prompt break patterns
  /IGNORE/g,
  /SYSTEM:/i,
  /ASSISTANT:/i,
];

/** Content filters for inappropriate inputs */
const CONTENT_FILTERS = [
  /\b(sexual|explicit|nude|porn|xxx)\b/i,
  /\b(kill|murder|death|suicide)\b/i,
  /\b(drug|cocaine|heroin|meth)\b/i,
  /\b(bomb|explosive|weapon|gun)\b/i,
];

/** Simple cost tracking (in-memory for demo - use Redis in production) */
const costTracking = new Map<
  string,
  { tokens: number; cost: number; resetTime: number }
>();

/**
 * Detect potential prompt injection attempts
 */
function detectPromptInjection(text: string): boolean {
  if (!text) return false;
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Filter inappropriate content
 */
function hasInappropriateContent(text: string): boolean {
  if (!text) return false;
  return CONTENT_FILTERS.some((pattern) => pattern.test(text));
}

/**
 * Sanitize user input for AI consumption
 */
function sanitizeForAI(text: string): string {
  if (!text) return "";

  // Remove potential injection patterns
  let sanitized = text
    .replace(/IGNORE/gi, "[REMOVED]")
    .replace(/SYSTEM:/gi, "[REMOVED]")
    .replace(/ASSISTANT:/gi, "[REMOVED]")
    .replace(/###/g, "[REMOVED]")
    .replace(/\\n\\n/g, "\n")
    .trim();

  // Limit length to prevent excessive token usage
  return sanitized.substring(0, 5000);
}

/**
 * Track AI usage costs (basic implementation)
 */
function trackAIUsage(userIP: string, estimatedTokens: number): boolean {
  const now = Date.now();
  const dailyLimit = 50000; // 50k tokens per day per IP
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours

  const current = costTracking.get(userIP);

  if (current) {
    if (now > current.resetTime) {
      // Reset daily limit
      costTracking.set(userIP, {
        tokens: estimatedTokens,
        cost: 0,
        resetTime: now + windowMs,
      });
      return true;
    } else if (current.tokens + estimatedTokens > dailyLimit) {
      return false; // Over limit
    } else {
      costTracking.set(userIP, {
        tokens: current.tokens + estimatedTokens,
        cost: current.cost,
        resetTime: current.resetTime,
      });
    }
  } else {
    costTracking.set(userIP, {
      tokens: estimatedTokens,
      cost: 0,
      resetTime: now + windowMs,
    });
  }

  return true;
}

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS,
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
 * Enhanced with prompt injection protection and cost limiting
 */
ai.post("/generate-soap", async (c) => {
  const apiKey = ENV.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "OpenAI API key not configured" }, 500);
  }

  // Get user IP for cost tracking
  const userIP =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

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

    const {
      muscles,
      sessionSummary,
      intakeData,
      prompt: clientPrompt,
    } = validated;

    // Security checks on user inputs
    const inputsToCheck = [
      sessionSummary || "",
      intakeData || "",
      clientPrompt || "",
      ...(muscles || []),
    ];

    // Check for prompt injection attempts
    for (const input of inputsToCheck) {
      if (detectPromptInjection(input)) {
        await logSecurityEvent(
          "warn",
          AUDIT_EVENTS.PROMPT_INJECTION_BLOCKED,
          {
            inputLength: input.length,
            inputPreview: input.substring(0, 100),
          },
          { userIP },
        );

        console.warn(
          `Prompt injection detected from IP ${userIP}:`,
          input.substring(0, 100),
        );
        return c.json(
          {
            error:
              "Invalid input detected. Please avoid special characters and system commands.",
          },
          400,
        );
      }

      if (hasInappropriateContent(input)) {
        await logSecurityEvent(
          "warn",
          AUDIT_EVENTS.INAPPROPRIATE_CONTENT_BLOCKED,
          {
            inputLength: input.length,
            inputPreview: input.substring(0, 50),
          },
          { userIP },
        );

        console.warn(
          `Inappropriate content detected from IP ${userIP}:`,
          input.substring(0, 100),
        );
        return c.json(
          {
            error:
              "Inappropriate content detected. Please keep content professional.",
          },
          400,
        );
      }
    }

    // Estimate token usage and check limits
    const estimatedTokens =
      Math.ceil(
        (sessionSummary?.length || 0) +
          (intakeData?.length || 0) +
          (clientPrompt?.length || 0),
      ) / 3; // Rough estimation: ~3 chars per token

    if (!trackAIUsage(userIP, estimatedTokens)) {
      await logSecurityEvent(
        "warn",
        AUDIT_EVENTS.AI_USAGE_LIMIT_EXCEEDED,
        {
          estimatedTokens,
          requestedInputLength: inputsToCheck.reduce(
            (sum, input) => sum + input.length,
            0,
          ),
        },
        { userIP },
      );

      return c.json(
        {
          error: "Daily AI usage limit exceeded. Please try again tomorrow.",
        },
        429,
      );
    }

    // Sanitize inputs before sending to AI
    const sanitizedSummary = sanitizeForAI(sessionSummary || "");
    const sanitizedIntake = sanitizeForAI(intakeData || "");
    const sanitizedPrompt = clientPrompt ? sanitizeForAI(clientPrompt) : null;

    // Use client-generated prompt if available, otherwise build it
    const prompt =
      sanitizedPrompt ||
      buildSOAPPrompt(muscles || [], sanitizedSummary, sanitizedIntake);

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
      API_TIMEOUT_MS,
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

    let content;
    try {
      content = JSON.parse(data.choices[0].message.content);
    } catch {
      console.error("Failed to parse AI response as JSON");
      return c.json({ error: "AI returned invalid response format" }, 502);
    }
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
