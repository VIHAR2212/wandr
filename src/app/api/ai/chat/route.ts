import { NextRequest, NextResponse } from 'next/server';
import { callAIChat } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { messages, tripContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    const systemPrompt = tripContext
      ? `You are Wandr AI, a friendly and expert travel assistant for this specific trip:
- Route: ${tripContext.origin ?? 'Unknown'} to ${tripContext.destination ?? 'Unknown'}
- Dates: ${tripContext.startDate ?? 'N/A'} to ${tripContext.endDate ?? 'N/A'}
- Travelers: ${tripContext.travelers ?? 1}
- Budget: ${tripContext.currency ?? 'INR'} ${tripContext.budget ?? 0}
- Purpose: ${tripContext.purpose ?? 'general travel'}
- Food preference: ${tripContext.foodPreference ?? 'any'}
Be concise, practical, and specific. Give actionable advice with real names and costs where possible.`
      : `You are Wandr AI, a friendly and expert travel assistant. Help travelers plan trips and answer questions. Be concise and practical.`;

    const aiMessages = messages
      .filter((m: { role: string; content: string }) => m.role && m.content)
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: String(m.content),
      }));

    const result = await callAIChat(systemPrompt, aiMessages);

    return NextResponse.json({ message: result.text, provider: result.provider });
  } catch (error: unknown) {
    console.error('[AI Chat]', error);
    const message = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
