// ============================================
// WANDR AI — Strictly 4x Groq Fallback System
// ============================================

interface AIResponse {
  content: string;
  provider: string;
  model: string;
}

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 6000; // 6 seconds strict limit to bypass Vercel 10s kill

async function callModel(apiKey: string, modelId: string, modelName: string, messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const res = await fetch(GROQ_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: modelId, messages, max_tokens: 4000, temperature: 0.7 }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch { 
    clearTimeout(timeout); 
    return null; 
  }
}

// FASTEST models first to guarantee it finishes before Vercel kills it
const MODELS = [
  { key: "GROQ_API_KEY_4", id: "llama-3.1-8b-instant", name: "Llama 3.1 8B" },
  { key: "GROQ_API_KEY_3", id: "gemma2-9b-it", name: "Gemma 2 9B" },
  { key: "GROQ_API_KEY_1", id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
  { key: "GROQ_API_KEY_2", id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
];

async function runFallback(messages: Array<{ role: string; content: string }>): Promise<AIResponse | null> {
  for (const m of MODELS) {
    const key = process.env[m.key];
    if (!key) continue;
    console.log(`⚡ Trying ${m.name}...`);
    const res = await callModel(key, m.id, m.name, messages);
    if (res) { 
      console.log(`✅ Success: ${m.name}`); 
      return { content: res, provider: "Groq", model: m.name }; 
    }
  }
  return null;
}

export async function generateAIResponse(prompt: string, systemPrompt?: string): Promise<AIResponse> {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });
  const res = await runFallback(messages);
  if (res) return res;
  throw new Error("All Groq models failed or timed out.");
}

export async function generateAIJson<T = any>(prompt: string, systemPrompt?: string) {
  const result = await generateAIResponse(prompt, systemPrompt);
  let cleaned = result.content.trim().replace(/```json|```/g, "");
  try {
    return { data: JSON.parse(cleaned) as T, provider: result.provider, model: result.model };
  } catch {
    throw new Error(`AI returned invalid JSON (via ${result.model}).`);
  }
}

export function getAvailableProviders(): string[] { 
  return MODELS.filter(m => process.env[m.key]).map(m => m.name); 
}

export async function callAIChat(msg: string, sys?: string): Promise<string> { 
  return (await generateAIResponse(msg, sys)).content; 
}

export async function callAIGenerate(msg: string, sys?: string): Promise<string> { 
  return (await generateAIResponse(msg, sys)).content; 
}

export async function callAIChatHistory(sys: string, msgs: Array<{ role: string; content: string }>) {
  const all: Array<{ role: string; content: string }> = [{ role: "system", content: sys }, ...msgs];
  const res = await runFallback(all);
  if (res) return { text: res.content, provider: res.provider, model: res.model };
  throw new Error("Chat failed.");
}
