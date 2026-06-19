// ============================================
// z.ai Integration — Replace Claude completely
// ============================================
// Put your z.ai API key in .env.local as ANTHROPIC_API_KEY
// Or set ZAI_API_KEY separately
// Change ZAI_BASE_URL and ZAI_MODEL if needed for your z.ai plan

const ZAI_BASE_URL =
  process.env.ZAI_BASE_URL || "https://api.z-ai.ai/v1/chat/completions";

const ZAI_API_KEY = process.env.ZAI_API_KEY || process.env.ANTHROPIC_API_KEY || "";

const ZAI_MODEL = process.env.ZAI_MODEL || "default";

export async function generateAIResponse(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  if (!ZAI_API_KEY) {
    throw new Error(
      "No API key found. Set ZAI_API_KEY or ANTHROPIC_API_KEY in .env.local"
    );
  }

  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const response = await fetch(ZAI_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ZAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: ZAI_MODEL,
      messages,
      max_tokens: 8192,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("z.ai API error:", response.status, errorText);
    throw new Error(
      `z.ai API error (${response.status}): ${errorText.slice(0, 200)}`
    );
  }

  const data = await response.json();

  // Handle both OpenAI-style and direct content responses
  if (data.choices && data.choices[0]) {
    return data.choices[0].message.content;
  }
  if (data.content) {
    return data.content;
  }
  if (typeof data === "string") {
    return data;
  }

  throw new Error("Unexpected response format from z.ai");
}

/**
 * Call z.ai and parse JSON from the response.
 * Handles cases where the AI wraps JSON in markdown code blocks.
 */
export async function generateAIJson<T = any>(
  prompt: string,
  systemPrompt?: string
): Promise<T> {
  const raw = await generateAIResponse(prompt, systemPrompt);

  let cleaned = raw.trim();

  // Remove markdown code block wrapping
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (parseError) {
    console.error("Failed to parse AI JSON response:", cleaned.slice(0, 500));
    throw new Error("AI returned invalid JSON. Please try again.");
  }
}
