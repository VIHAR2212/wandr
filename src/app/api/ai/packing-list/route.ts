import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: key });
}

export async function POST(req: NextRequest) {
  try {
    const { destination, duration, purpose, season, travelers } = await req.json();

    if (!destination || !duration) {
      return NextResponse.json({ error: 'destination and duration are required' }, { status: 400 });
    }

    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Generate a packing list for a ${duration}-day ${purpose ?? 'general'} trip to ${destination} in ${season ?? 'any'} season for ${travelers ?? 1} travelers.

Return ONLY valid JSON (no markdown):
{
  "packingList": [
    {
      "category": "Category Name",
      "items": [
        { "name": "Item name", "essential": true, "quantity": "2 pairs" }
      ]
    }
  ]
}

Include categories: Clothing, Footwear, Toiletries, Documents & Money, Electronics, Medical Kit, Snacks & Food, Activity Gear, Miscellaneous.
Mark truly essential items with essential: true.`,
      }],
    });

    const text = (response.content[0] as { type: string; text: string }).text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]);

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error('[Packing List]', error);
    const message = error instanceof Error ? error.message : 'Failed to generate packing list';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
