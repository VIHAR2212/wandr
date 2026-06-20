// ============================================
// WANDR AI — Multi-Provider Fallback System
// Primary: z.ai
// Fallback #1: Groq
// Fallback #2: Gemini
// ============================================

interface AIResponse {
  content: string;
  provider: string;
}

// ── z.ai Configuration ──────────────────────────────────────
const ZAI_CONFIG = {
  baseUrl: process.env.ZAI_BASE_URL || "https://api.z-ai.ai/v1/chat/completions",
  apiKey: process.env.ZAI_API_KEY || "",
  model: process.env.ZAI_MODEL || "default",
};

// ── Groq Configuration ──────────────────────────────────────
const GROQ_CONFIG = {
  baseUrl: "https://api.groq.com/openai/v1/chat/completions",
  apiKey: process.env.GROQ_API_KEY || "",
  model: "llama-3.3-70b-versatile",
};

// ── Gemini Configuration ────────────────────────────────────
const GEMINI_CONFIG = {
  baseUrl: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY || ""}`,
  apiKey: process.env.GEMINI_API_KEY || "",
  model: "gemini-2.0-flash",
};

// ── z.ai Caller ─────────────────────────────────────────────
async function callZAI(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  if (!ZAI_CONFIG.apiKey) {
    console.log("z.ai: No API key, skipping");
    return null;
  }

  try {
    console.log("z.ai: Calling...");
    const response = await fetch(ZAI_CONFIG.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZAI_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: ZAI_CONFIG.model,
        messages,
        max_tokens: 16384,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`z.ai error (${response.status}):`, err.slice(0, 200));
      return null;
    }

    const data = await response.json();

    if (data.choices?.[0]?.message?.content) {
      console.log("z.ai: Success!");
      return data.choices[0].message.content;
    }
    if (data.content) {
      console.log("z.ai: Success!");
      return typeof data.content === "string" ? data.content : JSON.stringify(data.content);
    }
    if (typeof data === "string") {
      console.log("z.ai: Success!");
      return data;
    }

    console.error("z.ai: Unexpected response format", JSON.stringify(data).slice(0, 200));
    return null;
  } catch (error) {
    console.error("z.ai: Failed:", error);
    return null;
  }
}

// ── Groq Caller ─────────────────────────────────────────────
async function callGroq(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  if (!GROQ_CONFIG.apiKey) {
    console.log("Groq: No API key, skipping");
    return null;
  }

  try {
    console.log("Groq: Calling...");
    const response = await fetch(GROQ_CONFIG.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_CONFIG.model,
        messages,
        max_tokens: 16384,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`Groq error (${response.status}):`, err.slice(0, 200));
      return null;
    }

    const data = await response.json();
    if (data.choices?.[0]?.message?.content) {
      console.log("Groq: Success!");
      return data.choices[0].message.content;
    }

    console.error("Groq: Unexpected response");
    return null;
  } catch (error) {
    console.error("Groq: Failed:", error);
    return null;
  }
}

// ── Gemini Caller ───────────────────────────────────────────
async function callGemini(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  if (!GEMINI_CONFIG.apiKey) {
    console.log("Gemini: No API key, skipping");
    return null;
  }

  try {
    console.log("Gemini: Calling...");

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find((m) => m.role === "system");

    const body: any = { contents };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
    }

    const response = await fetch(GEMINI_CONFIG.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`Gemini error (${response.status}):`, err.slice(0, 200));
      return null;
    }

    const data = await response.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log("Gemini: Success!");
      return data.candidates[0].content.parts[0].text;
    }

    console.error("Gemini: Unexpected response");
    return null;
  } catch (error) {
    console.error("Gemini: Failed:", error);
    return null;
  }
}

// ── Main AI Function with Fallback ──────────────────────────
export async function generateAIResponse(
  prompt: string,
  systemPrompt?: string
): Promise<AIResponse> {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const zaiResult = await callZAI(messages);
  if (zaiResult) {
    return { content: zaiResult, provider: "z.ai" };
  }

  const groqResult = await callGroq(messages);
  if (groqResult) {
    return { content: groqResult, provider: "Groq" };
  }

  const geminiResult = await callGemini(messages);
  if (geminiResult) {
    return { content: geminiResult, provider: "Gemini" };
  }

  throw new Error(
    "All AI providers failed. Please check your API keys:\n" +
    "- ZAI_API_KEY (primary)\n" +
    "- GROQ_API_KEY (fallback #1)\n" +
    "- GEMINI_API_KEY (fallback #2)"
  );
}

// ── JSON Parser ─────────────────────────────────────────────
export async function generateAIJson<T = any>(
  prompt: string,
  systemPrompt?: string
): Promise<{ data: T; provider: string }> {
  const result = await generateAIResponse(prompt, systemPrompt);

  let cleaned = result.content.trim();

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
    return { data: JSON.parse(cleaned) as T, provider: result.provider };
  } catch (parseError) {
    console.error("Failed to parse AI JSON:", cleaned.slice(0, 500));
    throw new Error(
      `AI returned invalid JSON (via ${result.provider}). Please try again.`
    );
  }
}

// ── Provider Check ──────────────────────────────────────────
export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (ZAI_CONFIG.apiKey) providers.push("z.ai");
  if (GROQ_CONFIG.apiKey) providers.push("Groq");
  if (GEMINI_CONFIG.apiKey) providers.push("Gemini");
  return providers;
}

// ── Backward-Compatible Aliases ─────────────────────────────
export async function callAIChat(
  message: string,
  systemPrompt?: string
): Promise<string> {
  const result = await generateAIResponse(message, systemPrompt);
  return result.content;
}

export async function callAIGenerate(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const result = await generateAIResponse(prompt, systemPrompt);
  return result.content;
}

// ── Chat with Message History ───────────────────────────────
export async function callAIChatHistory(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
): Promise<{ text: string; provider: string }> {
  const allMessages: Array<{ role: string; content: string }> = [];
  allMessages.push({ role: "system", content: systemPrompt });
  allMessages.push(...messages);

  const zaiResult = await callZAI(allMessages);
  if (zaiResult) return { text: zaiResult, provider: "z.ai" };

  const groqResult = await callGroq(allMessages);
  if (groqResult) return { text: groqResult, provider: "Groq" };

  const geminiResult = await callGemini(allMessages);
  if (geminiResult) return { text: geminiResult, provider: "Gemini" };

  throw new Error("All AI providers failed for chat");
}
