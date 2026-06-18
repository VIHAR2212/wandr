import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: key });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.json();
    const {
      origin, destination, startDate, endDate, travelers,
      budget, currency, purpose, foodPreference, hotelPreference,
      transportPreferences, specialRequests, includeHiddenGems, flexibleBudget,
    } = formData;

    if (!origin || !destination || !startDate || !endDate || !budget) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const startD = new Date(startDate);
    const endD = new Date(endDate);
    const duration = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000));

    const CURRENCY_SYMBOL: Record<string, string> = {
      INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', JPY: '¥', SGD: 'S$',
    };
    const sym = CURRENCY_SYMBOL[currency] ?? currency;

    const PURPOSE_LABEL: Record<string, string> = {
      ADVENTURE: 'adventure and thrill-seeking',
      DEVOTIONAL: 'religious/devotional visits and spiritual experiences',
      HIKING: 'trekking and nature hiking',
      HONEYMOON: 'romantic honeymoon experiences',
      FAMILY: 'family-friendly activities suitable for all ages',
      PHOTOGRAPHY: 'photography — golden hours, landscapes, architecture',
      BUSINESS: 'business travel with efficient scheduling',
      FOOD_EXPLORATION: 'food exploration and culinary discovery',
      WELLNESS: 'wellness, yoga, meditation, and relaxation',
      CULTURAL: 'cultural immersion, museums, local heritage',
      SOLO: 'solo travel with safety and social opportunities',
      BACKPACKING: 'budget backpacking',
    };

    const FOOD_LABEL: Record<string, string> = {
      VEG: 'strictly vegetarian (no meat, fish, or eggs)',
      JAIN: 'Jain diet (no root vegetables like onion, garlic, potato)',
      VEGAN: 'fully vegan (no animal products)',
      HALAL: 'halal-certified food only',
      NON_VEG: 'any cuisine including non-vegetarian',
    };

    const client = getClient();

    const systemPrompt = `You are Wandr AI — the world's most advanced AI travel agent. You plan complete, accurate, budget-perfect trips.

CRITICAL RULES:
1. BUDGET IS A STRICT HARD CONSTRAINT. Total trip cost MUST NOT exceed ${sym}${budget}. Every single cost must be realistic and accurate.
2. All food must be ${FOOD_LABEL[foodPreference] ?? 'any cuisine'}.
3. Trip style: ${PURPOSE_LABEL[purpose] ?? purpose}.
4. Hotel category: ${hotelPreference}.
5. Preferred transport: ${(transportPreferences ?? []).join(', ')}.
6. Plan for ${travelers} travelers.
7. Return ONLY valid JSON. No markdown fences. No explanation text. Pure JSON object only.`;

    const userPrompt = `Plan a complete ${duration}-day trip from ${origin} to ${destination}.

Trip details:
- Dates: ${startDate} to ${endDate} (${duration} days)
- Travelers: ${travelers}
- Hard budget limit: ${sym}${budget} ${currency}
- Purpose: ${PURPOSE_LABEL[purpose] ?? purpose}
- Food: ${FOOD_LABEL[foodPreference] ?? foodPreference}
- Hotel: ${hotelPreference}
- Transport: ${(transportPreferences ?? []).join(', ')}
- Hidden gems: ${includeHiddenGems ? 'yes, include secret spots' : 'standard attractions only'}
- Budget flexibility: ${flexibleBudget ? 'up to 10% extra if significantly better' : 'strict, no flexibility'}
${specialRequests ? `- Special requests: ${specialRequests}` : ''}

Return this exact JSON (fill all fields with real data, null only if genuinely unknown):
{
  "title": "Creative trip title",
  "summary": "2-3 compelling sentences summarizing this trip",
  "totalCost": number,
  "days": [
    {
      "dayNumber": 1,
      "date": "${startDate}",
      "theme": "Day theme",
      "summary": "What makes today special",
      "totalCost": number,
      "activities": [
        {
          "time": "09:00",
          "duration": 90,
          "type": "SIGHTSEEING",
          "title": "Activity name",
          "description": "Detailed practical description",
          "location": "Full area or address",
          "lat": null,
          "lng": null,
          "cost": number,
          "notes": "Insider tip",
          "bookingUrl": null,
          "tips": ["tip1", "tip2"]
        }
      ]
    }
  ],
  "budget": {
    "total": ${budget},
    "actualCost": number,
    "transport": number,
    "accommodation": number,
    "food": number,
    "activities": number,
    "miscellaneous": number,
    "emergencyFund": number,
    "perDay": number,
    "perPerson": number,
    "breakdown": [
      { "category": "string", "amount": number, "percentage": number, "details": "string" }
    ]
  },
  "hotels": [
    {
      "name": "string",
      "type": "${hotelPreference}",
      "location": "string",
      "lat": null,
      "lng": null,
      "pricePerNight": number,
      "totalCost": number,
      "rating": 4.2,
      "amenities": ["WiFi", "AC"],
      "bookingUrl": null,
      "phone": null,
      "pros": ["pro1"],
      "cons": ["con1"]
    }
  ],
  "restaurants": [
    {
      "name": "string",
      "cuisine": "string",
      "location": "string",
      "lat": null,
      "lng": null,
      "priceRange": "${sym}200-500 per person",
      "rating": 4.5,
      "specialties": ["dish1"],
      "openingHours": "9 AM - 10 PM",
      "phone": null,
      "dietaryOptions": ["${foodPreference}"],
      "mustTry": ["dish1"]
    }
  ],
  "hiddenGems": [
    {
      "name": "string",
      "type": "string",
      "description": "Why this place is special",
      "location": "string",
      "lat": null,
      "lng": null,
      "bestTime": "Early morning",
      "cost": number,
      "crowdLevel": "LOW",
      "insiderTip": "Secret tip"
    }
  ],
  "safety": {
    "overallScore": 7,
    "crimeLevel": "LOW",
    "scamAlerts": ["scam1", "scam2"],
    "emergencyContacts": [
      { "name": "Police", "number": "100", "type": "POLICE" },
      { "name": "Ambulance", "number": "108", "type": "AMBULANCE" },
      { "name": "Tourist Helpline", "number": "1800-111-363", "type": "TOURIST_HELPLINE" }
    ],
    "hospitals": [
      { "name": "Hospital name", "address": "Area", "phone": "number", "distance": "2 km" }
    ],
    "policeStations": [
      { "name": "Police station name", "address": "Area", "phone": "100", "distance": "1 km" }
    ],
    "safeAreas": ["area1"],
    "avoidAreas": ["area2"],
    "travelAdvisory": null,
    "vaccinations": ["vaccine1"]
  },
  "packingList": [
    {
      "category": "Clothing",
      "items": [
        { "name": "item", "essential": true, "quantity": "3 pairs" }
      ]
    }
  ],
  "seasonalTips": ["tip1", "tip2", "tip3"],
  "localPhrases": [
    { "phrase": "Thank you", "translation": "local word", "pronunciation": "pronunciation" }
  ],
  "transportGuide": {
    "primaryRoute": [
      {
        "from": "${origin}",
        "to": "${destination}",
        "mode": "${(transportPreferences ?? ['FLIGHT'])[0]}",
        "duration": "2h 30m",
        "cost": number,
        "details": "Booking info",
        "bookingInfo": "How to book"
      }
    ],
    "totalTransportCost": number,
    "tips": ["transport tip"]
  },
  "weatherForecast": [
    {
      "date": "${startDate}",
      "condition": "Sunny",
      "temperature": { "min": 22, "max": 31, "unit": "C" },
      "humidity": 65,
      "rainfall": 0,
      "icon": "☀️",
      "alert": null
    }
  ],
  "crowdPrediction": {
    "peak": ["Saturday", "Sunday"],
    "bestTimeToVisit": ["Weekday mornings"],
    "avoidDates": []
  }
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response type');

    let trip: Record<string, unknown>;
    try {
      const text = content.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON object found in AI response');
      trip = JSON.parse(match[0]);
    } catch {
      throw new Error('AI returned invalid JSON. Please try again.');
    }

    // Enforce budget constraint
    const totalCost = Number(trip.totalCost ?? 0);
    const maxAllowed = flexibleBudget ? budget * 1.10 : budget;
    if (totalCost > maxAllowed) {
      trip.totalCost = budget;
      if (trip.budget && typeof trip.budget === 'object') {
        (trip.budget as Record<string, unknown>).actualCost = budget;
      }
    }

    const tripId = `trip_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const tripData = {
      tripId,
      formData,
      generatedTrip: trip,
      createdAt: new Date().toISOString(),
    };

    const encoded = encodeURIComponent(JSON.stringify(tripData));
    const cookie = `trip_${tripId}=${encoded}; Path=/; Max-Age=7200; SameSite=Lax`;

    return NextResponse.json({ success: true, tripId }, {
      headers: { 'Set-Cookie': cookie },
    });
  } catch (error: unknown) {
    console.error('[Generate Trip]', error);
    const message = error instanceof Error ? error.message : 'Failed to generate trip';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
