// ============================================
// WANDR AI — 4 Accounts + 8s Timeouts
// Prevents Vercel from killing the function
// ============================================

interface AIResponse {
  content: string;
  provider: string;
  model: string;
}

const GROQ_PROVIDERS = [
  { keyEnv: "GROQ_API_KEY_1", model: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
  { keyEnv: "GROQ_API_KEY_2", model: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
  { keyEnv: "GROQ_API_KEY_3", model: "gemma2-9b-it", name: "Gemma 2 9B" },
  { keyEnv: "GROQ_API_KEY_4", model: "llama-3.1-8b-instant", name: "Llama 3.1 8B" },
];

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 8000; // 8 seconds max per API call

async function callGroqAccount(
  apiKey: string,
  modelId: string,
  modelName: string,
  messages: Array<{ role: string; content: string }>
): Promise<string | null> {
  // ⚡ AbortController kills the request if it takes > 8s
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    console.log(`🔄 Trying ${modelName}...`);

    const response = await fetch(GROQ_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: 8192, // Slightly lowered for faster response
        temperature: 0.7,
      }),
      signal: controller.signal, // Connects the timeout to fetch
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`❌ ${modelName} failed (${response.status})`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (text) {
      console.log(`✅ Success with ${modelName}!`);
      return text;
    }

    return null;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // If it timed out, log it and move to the next key
    if (error.name === "AbortError") {
      console.error(`⏱️ ${modelName} timed out after 8s`);
      return null;
    }
    
    console.error(`❌ ${modelName} crashed: ${error.message}`);
    return null;
  }
}

async function tryAllAccounts(
  messages: Array<{ role: string; content: string }>
): Promise<AIResponse | null> {
  for (const provider of GROQ_PROVIDERS) {
    const apiKey = process.env[provider.keyEnv];

    if (!apiKey) {
      console.log(`⏭️ Skipping ${provider.name} (Key ${provider.keyEnv} missing)`);
      continue;
    }

    const result = await callGroqAccount(apiKey, provider.model, provider.name, messages);
    
    if (result) {
      return { content: result, provider: "Groq", model: provider.name };
    }
  }
  return null;
}

export async function generateAIResponse(
  prompt: string,
  systemPrompt?: string
): Promise<AIResponse> {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const result = await tryAllAccounts(messages);
  if (result) return result;

  throw new Error("All 4 Groq accounts failed or timed out.");
}

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
    return { data: JSON.parse(cleaned) as T, provider: result.provider, model: result.model };
  } catch {
    throw new Error(`AI returned invalid JSON (via ${result.model}).`);
  }
}

export function getAvailableProviders(): string[] {
  return GROQ_PROVIDERS.filter(p => process.env[p.keyEnv]).map(p => `Groq: ${p.name}`);
}

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
  const result = await tryAllAccounts(allMessages);
  if (result) return { text: result.content, provider: result.provider, model: result.model };
  throw new Error("All 4 Groq accounts failed for chat.");
}
