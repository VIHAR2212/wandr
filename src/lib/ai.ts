// ============================================
// WANDR AI — Strictly 4x Groq Fallback System
// 1. llama-3.3-70b  (Smartest)
// 2. mixtral-8x7b    (Best at formatting)
// 3. gemma2-9b-it    (Most stable)
// 4. llama-3.1-8b    (Fastest)
// ============================================

interface AIResponse {
  content: string;
  provider: string;
  model: string;
}

// ── The 4 Free Groq Models ──────────────────────────────────
const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B" },
];

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

// ── Call a single Groq model ────────────────────────────────
async function callGroqModel(
  modelId: string,
  messages: Array<{ role: string; content: string }>
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) return null;

  try {
    console.log(`🔄 Trying Groq: ${modelId}...`);

    const response = await fetch(GROQ_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: 16384,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error(`❌ ${modelId} failed (${response.status})`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (text) {
      console.log(`✅ Success with ${modelId}`);
      return text;
    }

    return null;
  } catch (error) {
    console.error(`❌ ${modelId} crashed`);
    return null;
  }
}

// ── Loop through all 4 models ───────────────────────────────
async function tryGroqFallback(
  messages: Array<{ role: string; content: string }>
): Promise<AIResponse | null> {
  for (const model of GROQ_MODELS) {
    const result = await callGroqModel(model.id, messages);
    
    if (result) {
      return {
        content: result,
        provider: "Groq",
        model: model.name,
      };
    }
    
    // Wait 500ms before hitting the next model to prevent rate limits
    await new Promise((r) => setTimeout(r, 500));
  }
  
  return null;
}

// ── Main AI Function ────────────────────────────────────────
export async function generateAIResponse(
  prompt: string,
  systemPrompt?: string
): Promise<AIResponse> {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const result = await tryGroqFallback(messages);

  if (result) return result;

  throw new Error(
    "All 4 Groq models failed. Your GROQ_API_KEY is likely dead.\n" +
    "Fix: Go to https://console.groq.com/keys, delete the old key, create a new one, paste in .env.local, and restart server."
  );
}

// ── JSON Parser ─────────────────────────────────────────────
export async function generateAIJson<T = any>(
  prompt: string,
  systemPrompt?: string
): Promise<{ data: T; provider: string; model: string }> {
  const result = await generateAIResponse(prompt, systemPrompt);

  let cleaned = result.content.trim();

  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    return {
      data: JSON.parse(cleaned) as T,
      provider: result.provider,
      model: result.model,
    };
  } catch {
    throw new Error(`AI returned invalid JSON (via ${result.model}). Try again.`);
  }
}

// ── Provider Check ──────────────────────────────────────────
export function getAvailableProviders(): string[] {
  return process.env.GROQ_API_KEY 
    ? GROQ_MODELS.map((m) => `Groq: ${m.name}`) 
    : [];
}

// ── Backward-Compatible Aliases ─────────────────────────────
export async function callAIChat(message: string, systemPrompt?: string): Promise<string> {
  return (await generateAIResponse(message, systemPrompt)).content;
}

export async function callAIGenerate(prompt: string, systemPrompt?: string): Promise<string> {
  return (await generateAIResponse(prompt, systemPrompt)).content;
}

export async function callAIChatHistory(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
): Promise<{ text: string; provider: string; model: string }> {
  const allMessages = [{ role: "system" as const, content: systemPrompt }, ...messages];
  
  const result = await tryGroqFallback(allMessages);
  if (result) return { text: result.content, provider: result.provider, model: result.model };

  throw new Error("All 4 Groq models failed for chat.");
}
