import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: key });
}

export async function POST(req: NextRequest) {
  try {
    const { tripContext, disruption, currentDay } = await req.json();

    if (!tripContext || !disruption) {
      return NextResponse.json({ error: 'tripContext and disruption are required' }, { status: 400 });
    }

    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Emergency trip replan needed.

TRIP: ${tripContext.origin} → ${tripContext.destination}
BUDGET REMAINING: ${tripContext.currency} ${tripContext.budgetRemaining}
CURRENT DAY: Day ${currentDay} of ${tripContext.duration}
TRAVELERS: ${tripContext.travelers}
FOOD PREFERENCE: ${tripContext.foodPreference ?? 'any'}

DISRUPTION: ${disruption}

Return ONLY valid JSON (no markdown):
{
  "summary": "What changed and why",
  "revisedDays": [
    {
      "dayNumber": number,
      "date": "YYYY-MM-DD",
      "theme": "string",
      "activities": [
        {
          "time": "HH:MM",
          "duration": number,
          "type": "TRANSPORT",
          "title": "string",
          "description": "string",
          "location": "string",
          "cost": number,
          "notes": "string"
        }
      ],
      "totalCost": number
    }
  ],
  "newTotalCost": number,
  "alerts": ["alert1"],
  "alternatives": ["option1"]
}`,
      }],
    });

    const text = (response.content[0] as { type: string; text: string }).text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]);

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error('[Replan]', error);
    const message = error instanceof Error ? error.message : 'Replan failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
