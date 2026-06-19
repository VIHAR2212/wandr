// src/lib/ai.ts
// Multi-AI provider: Anthropic → Groq → Gemini fallback chain

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  text: string;
  provider: string;
  model: string;
}

// ── Anthropic ──────────────────────────────────────────────
async function callAnthropic(
  system: string,
  messages: AIMessage[],
  maxTokens = 8192
): Promise<AIResponse> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Anthropic error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  if (!text) throw new Error('Anthropic returned empty response');
  return { text, provider: 'anthropic', model: 'claude-sonnet-4-6' };
}

// ── Groq ───────────────────────────────────────────────────
async function callGroq(
  system: string,
  messages: AIMessage[],
  maxTokens = 8192
): Promise<AIResponse> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const groqMessages = [
    { role: 'system', content: system },
    ...messages,
  ];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: Math.min(maxTokens, 8000),
      messages: groqMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Groq returned empty response');
  return { text, provider: 'groq', model: 'llama-3.3-70b-versatile' };
}

// ── Gemini ─────────────────────────────────────────────────
async function callGemini(
  system: string,
  messages: AIMessage[],
  maxTokens = 8192
): Promise<AIResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  // Gemini uses a different format
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Gemini returned empty response');
  return { text, provider: 'gemini', model: 'gemini-1.5-flash' };
}

// ── Main: Fallback chain ────────────────────────────────────
// Order: Anthropic → Groq → Gemini
export async function callAI(
  system: string,
  messages: AIMessage[],
  maxTokens = 8192
): Promise<AIResponse> {
  const errors: string[] = [];

  // Try Anthropic first
  try {
    return await callAnthropic(system, messages, maxTokens);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Anthropic: ${msg}`);
    console.warn('[AI Fallback] Anthropic failed:', msg);
  }

  // Try Groq second
  try {
    return await callGroq(system, messages, maxTokens);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Groq: ${msg}`);
    console.warn('[AI Fallback] Groq failed:', msg);
  }

  // Try Gemini third
  try {
    return await callGemini(system, messages, maxTokens);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Gemini: ${msg}`);
    console.warn('[AI Fallback] Gemini failed:', msg);
  }

  throw new Error(
    `All AI providers failed. Errors: ${errors.join(' | ')}`
  );
}

// Chat-optimised (smaller token limit, faster)
export async function callAIChat(
  system: string,
  messages: AIMessage[]
): Promise<AIResponse> {
  return callAI(system, messages, 1024);
}
