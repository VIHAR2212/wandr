import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { tripContext, disruption, currentDay } = await req.json();
    if (!tripContext || !disruption) {
      return NextResponse.json({ error: 'tripContext and disruption are required' }, { status: 400 });
    }

    const result = await callAI(
      'You are Wandr AI, an expert travel replanning assistant. Return ONLY valid JSON with no markdown.',
      [{
        role: 'user',
        content: `Emergency trip replan needed.
TRIP: ${tripContext.origin} to ${tripContext.destination}
BUDGET REMAINING: ${tripContext.currency} ${tripContext.budgetRemaining}
CURRENT DAY: Day ${currentDay} of ${tripContext.duration}
TRAVELERS: ${tripContext.travelers}
DISRUPTION: ${disruption}

Return ONLY valid JSON:
{
  "summary": "What changed and why",
  "revisedDays": [
    {
      "dayNumber": number, "date": "YYYY-MM-DD", "theme": "string",
      "activities": [
        { "time": "HH:MM", "duration": number, "type": "TRANSPORT",
          "title": "string", "description": "string", "location": "string", "cost": number, "notes": "string" }
      ],
      "totalCost": number
    }
  ],
  "newTotalCost": number,
  "alerts": ["alert1"],
  "alternatives": ["option1"]
}`,
      }],
      2048
    );

    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]);
    return NextResponse.json({ ...parsed, aiProvider: result.provider });
  } catch (error: unknown) {
    console.error('[Replan]', error);
    const message = error instanceof Error ? error.message : 'Replan failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
