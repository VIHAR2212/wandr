import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: key });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, tripContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    const systemPrompt = tripContext
      ? `You are Wandr AI, a friendly and expert travel assistant for this specific trip:
- Route: ${tripContext.origin ?? 'Unknown'} → ${tripContext.destination ?? 'Unknown'}
- Dates: ${tripContext.startDate ?? 'N/A'} to ${tripContext.endDate ?? 'N/A'}
- Travelers: ${tripContext.travelers ?? 1}
- Budget: ${tripContext.currency ?? 'INR'} ${tripContext.budget ?? 0}
- Purpose: ${tripContext.purpose ?? 'general travel'}
- Food preference: ${tripContext.foodPreference ?? 'any'}

Be concise, practical, and specific. Give actionable advice with real names and costs where possible.`
      : `You are Wandr AI, a friendly and expert travel assistant. Help travelers plan trips, answer destination questions, and provide travel advice. Be concise and practical.`;

    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
        .filter((m: { role: string; content: string }) => m.role && m.content)
        .map((m: { role: string; content: string }) => ({
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: String(m.content),
        })),
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    return NextResponse.json({ message: content.text });
  } catch (error: unknown) {
    console.error('[AI Chat]', error);
    const message = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
