// ============================================
// WANDR AI — 4 Accounts, 4 Models Fallback
// Account 1: Llama 3.3 70B (Smartest)
// Account 2: Mixtral 8x7B (Best formatting)
// Account 3: Gemma 2 9B (Most stable)
// Account 4: Llama 3.1 8B (Fastest)
// ============================================

interface AIResponse {
  content: string;
  provider: string;
  model: string;
}

// ── 4 Accounts mapped to 4 Models ───────────────────────────
const GROQ_PROVIDERS = [
  { 
    keyEnv: "GROQ_API_KEY_1", 
    model: "llama-3.3-70b-versatile", 
    name: "Llama 3.3 70B" 
  },
  { 
    keyEnv: "GROQ_API_KEY_2", 
    model: "mixtral-8x7b-32768", 
    name: "Mixtral 8x7B" 
  },
  { 
    keyEnv: "GROQ_API_KEY_3", 
    model: "gemma2-9b-it", 
    name: "Gemma 2 9B" 
  },
  { 
    keyEnv: "GROQ_API_KEY_4", 
    model: "llama-3.1-8b-instant", 
    name: "Llama 3.1 8B" 
  },
];

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

// ── Call a specific Account + Model ─────────────────────────
async function callGroqAccount(
  apiKey: string,
  modelId: string,
  modelName: string,
  messages: Array<{ role: string; content: string }>
): Promise<string | null> {
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
        max_tokens: 16384,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`❌ ${modelName} failed (${response.status}): ${err.slice(0, 100)}`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (text) {
      console.log(`✅ Success with ${modelName}!`);
      return text;
    }

    return null;
  } catch (error) {
    console.error(`❌ ${modelName} crashed`);
    return null;
  }
}

// ── Loop through all 4 Accounts ─────────────────────────────
async function tryAllAccounts(
  messages: Array<{ role: string; content: string }>
): Promise<AIResponse | null> {
  
  for (const provider of GROQ_PROVIDERS) {
    const apiKey = process.env[provider.keyEnv];

    // Skip if this specific account key is missing
    if (!apiKey) {
      console.log(`⏭️ Skipping ${provider.name} (${provider.keyEnv} not set)`);
      continue;
    }

    const result = await callGroqAccount(
      apiKey, 
      provider.model, 
      provider.name, 
      messages
    );
    
    if (result) {
      return {
        content: result,
        provider: "Groq",
        model: provider.name,
      };
    }
    
    // Wait 500ms before trying the next account
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

  const result = await tryAllAccounts(messages);

  if (result) return result;

  // Check which keys are actually missing to give a helpful error
  const missingKeys = GROQ_PROVIDERS
    .map(p => p.keyEnv)
    .filter(k => !process.env[k]);

  throw new Error(
    `All 4 Groq accounts failed. ${missingKeys.length > 0 ? `Missing keys: ${missingKeys.join(", ")}` : "All keys are likely invalid or rate-limited."}\n\n` +
    "Check your .env.local for GROQ_API_KEY_1, GROQ_API_KEY_2, GROQ_API_KEY_3, GROQ_API_KEY_4"
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
  return GROQ_PROVIDERS
    .filter(p => process.env[p.keyEnv])
    .map(p => `Groq: ${p.name}`);
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
  
  const result = await tryAllAccounts(allMessages);
  if (result) return { text: result.content, provider: result.provider, model: result.model };

  throw new Error("All 4 Groq accounts failed for chat.");
}
