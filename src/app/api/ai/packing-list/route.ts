import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { destination, duration, purpose, season, travelers } = await req.json();
    if (!destination || !duration) {
      return NextResponse.json({ error: 'destination and duration are required' }, { status: 400 });
    }

    const result = await callAI(
      'You are a travel packing expert. Return ONLY valid JSON with no markdown.',
      [{
        role: 'user',
        content: `Generate a packing list for a ${duration}-day ${purpose ?? 'general'} trip to ${destination} in ${season ?? 'any'} season for ${travelers ?? 1} travelers.

Return ONLY valid JSON:
{
  "packingList": [
    {
      "category": "Category Name",
      "items": [{ "name": "Item name", "essential": true, "quantity": "2 pairs" }]
    }
  ]
}
Categories: Clothing, Footwear, Toiletries, Documents & Money, Electronics, Medical Kit, Snacks & Food, Activity Gear, Miscellaneous.`,
      }],
      2048
    );

    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]);
    return NextResponse.json({ ...parsed, aiProvider: result.provider });
  } catch (error: unknown) {
    console.error('[Packing List]', error);
    const message = error instanceof Error ? error.message : 'Failed to generate packing list';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
