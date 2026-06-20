// ============================================
// WANDR AI — Multi-Provider Fallback System
// Primary: Groq
// Fallback #1: Gemini
// Fallback #2: z.ai
// ============================================

interface AIResponse {
  content: string;
  provider: string;
}

// ── Groq Configuration ──────────────────────────────────────
const GROQ_CONFIG = {
  baseUrl: "https://api.groq.com/openai/v1/chat/completions",
  model: "llama-3.3-70b-versatile",
};

// ── Gemini Configuration ────────────────────────────────────
const GEMINI_MODEL = "gemini-2.0-flash";

// ── z.ai Configuration ──────────────────────────────────────
const ZAI_CONFIG = {
  baseUrl: process.env.ZAI_BASE_URL || "https://api.z-ai.ai/v1/chat/completions",
  model: process.env.ZAI_MODEL || "default",
};

// ── Helper: Get API key at CALL TIME ──
function getKey(name: string): string {
  const key = process.env[name];
  if (!key) {
    console.log(`${name}: Not set in .env.local, skipping`);
    return "";
  }
  return key;
}

// ── Groq Caller (PRIMARY) ───────────────────────────────────
async function callGroq(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const apiKey = getKey("GROQ_API_KEY");
  if (!apiKey) return null;

  try {
    console.log("🔄 Groq: Calling...");
    const response = await fetch(GROQ_CONFIG.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
      console.error(`❌ Groq error (${response.status}):`, err.slice(0, 300));
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (text) {
      console.log("✅ Groq: Success!");
      return text;
    }

    console.error("❌ Groq: Empty response");
    return null;
  } catch (error) {
    console.error("❌ Groq: Failed:", error);
    return null;
  }
}

// ── Gemini Caller (FALLBACK #1) ─────────────────────────────
async function callGemini(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const apiKey = getKey("GEMINI_API_KEY");
  if (!apiKey) return null;

  try {
    console.log("🔄 Gemini: Calling...");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`❌ Gemini error (${response.status}):`, err.slice(0, 300));
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      console.log("✅ Gemini: Success!");
      return text;
    }

    console.error("❌ Gemini: Empty response");
    return null;
  } catch (error) {
    console.error("❌ Gemini: Failed:", error);
    return null;
  }
}

// ── z.ai Caller (FALLBACK #2) ───────────────────────────────
async function callZAI(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const apiKey = getKey("ZAI_API_KEY");
  if (!apiKey) return null;

  try {
    console.log("🔄 z.ai: Calling...");
    const response = await fetch(ZAI_CONFIG.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
      console.error(`❌ z.ai error (${response.status}):`, err.slice(0, 300));
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || data.content;

    if (text) {
      console.log("✅ z.ai: Success!");
      return typeof text === "string" ? text : JSON.stringify(text);
    }

    console.error("❌ z.ai: Empty response");
    return null;
  } catch (error) {
    console.error("❌ z.ai: Failed:", error);
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

  // 1️⃣ Groq first
  const groqResult = await callGroq(messages);
  if (groqResult) {
    return { content: groqResult, provider: "Groq" };
  }

  // 2️⃣ Gemini fallback
  const geminiResult = await callGemini(messages);
  if (geminiResult) {
    return { content: geminiResult, provider: "Gemini" };
  }

  // 3️⃣ z.ai last resort
  const zaiResult = await callZAI(messages);
  if (zaiResult) {
    return { content: zaiResult, provider: "z.ai" };
  }

  throw new Error(
    "All AI providers failed.\n" +
    "Fix: Add at least one API key to your .env.local:\n" +
    "  GROQ_API_KEY=gsk_...      (get from https://console.groq.com/keys)\n" +
    "  GEMINI_API_KEY=AIzaSy...  (get from https://aistudio.google.com/apikey)\n" +
    "  ZAI_API_KEY=...           (if you have a z.ai account)"
  );
}

// ── JSON Parser ─────────────────────────────────────────────
export async function generateAIJson<T = any>(
  prompt: string,
  systemPrompt?: string
): Promise<{ data: T; provider: string }> {
  const result = await generateAIResponse(prompt, systemPrompt);

  let cleaned = result.content.trim();

  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    return { data: JSON.parse(cleaned) as T, provider: result.provider };
  } catch {
    console.error("Failed to parse AI JSON:", cleaned.slice(0, 500));
    throw new Error(
      `AI returned invalid JSON (via ${result.provider}). Please try again.`
    );
  }
}

// ── Provider Check ──────────────────────────────────────────
export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (process.env.GROQ_API_KEY) providers.push("Groq");
  if (process.env.GEMINI_API_KEY) providers.push("Gemini");
  if (process.env.ZAI_API_KEY) providers.push("z.ai");
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

  const groqResult = await callGroq(allMessages);
  if (groqResult) return { text: groqResult, provider: "Groq" };

  const geminiResult = await callGemini(allMessages);
  if (geminiResult) return { text: geminiResult, provider: "Gemini" };

  const zaiResult = await callZAI(allMessages);
  if (zaiResult) return { text: zaiResult, provider: "z.ai" };

  throw new Error("All AI providers failed for chat");
}
