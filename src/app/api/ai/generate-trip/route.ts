import { NextRequest, NextResponse } from 'next/server';
import { generateAIJson } from '@/lib/ai';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be signed in to generate a trip.' },
        { status: 401 }
      );
    }

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

    const systemPrompt = `Expert travel planner. Return ONLY valid JSON, no markdown. Costs in ${currency ?? 'INR'}. Food: ${FOOD_LABEL[foodPreference] ?? 'any'}. Style: ${PURPOSE_LABEL[purpose] ?? purpose}. Hotel: ${hotelPreference}.`;

    const userPrompt = `${duration}-day ${destination} trip. Budget: ${budget} ${currency ?? 'INR'}, ${travelers ?? 1} traveler(s), ${startDate} to ${endDate}. Transport pref: ${(transportPreferences ?? []).join('/') || 'any'}.${specialRequests ? ` Notes: ${specialRequests}.` : ''}

STRICT JSON (no markdown, no text):
{"destination":"${destination}","title":"...","summary":"2-3 lines","totalDays":${duration},"itinerary":[{"day":1,"date":"${startDate}","theme":"Theme","activities":[{"time":"06:00-08:15","type":"TRANSPORT","title":"Flight: ${origin} to ${destination}","description":"IndiGo 6E-204 · T2 Departure · Arrives T1","location":"${origin} Airport","lat":0,"lng":0,"cost":0,"duration":135,"notes":"Reach airport 2hrs early"},{"time":"09:00","type":"SIGHTSEEING","title":"Visit Place","description":"Details","location":"Exact Place Name","lat":0,"lng":0,"cost":0,"duration":90,"notes":"tip"}]}],"hotels":[{"name":"Hotel Name","area":"Area","lat":0,"lng":0,"pricePerNight":2000,"rating":4,"amenities":["WiFi"],"diet":"${foodPreference || 'all'}"}],"restaurants":[{"name":"Restaurant Name","cuisine":"Food type","diet":"${foodPreference || 'all'}","lat":0,"lng":0,"pricePerPerson":300,"rating":4,"mustTry":["dish"]}],"hiddenGems":[{"name":"Offbeat Spot","description":"Why it's special","lat":0,"lng":0,"when":"Early morning","cost":0}],"transportGuide":{"overview":"Brief transport overview","legs":[{"from":"${origin}","to":"${destination}","mode":"${(transportPreferences ?? ['FLIGHT'])[0]}","duration":"2h","cost":0,"operator":"Airline/Railway","vehicleNo":"6E-204","vehicle":"A320neo"}]},"budgetBreakdown":{"accommodation":0,"food":0,"transport":0,"activities":0,"misc":0,"total":${budget}},"packingList":[{"item":"Comfortable shoes","reason":"For walking","category":"clothing","essential":true}],"weatherForecast":{"expected":"Pleasant","avgTemp":"28°C","tips":["Carry water"],"forecast":[{"date":"${startDate}","condition":"Sunny","high":32,"low":22}]},"safety":{"overallScore":8,"tips":["Stay aware"],"emergencyNumber":"112","scamAlerts":["Common scam"],"hospitals":[{"name":"Nearest Hospital","distance":"2km","phone":"0"}]}}

RULES:
1. Return ONLY valid JSON. No markdown fences, no comments, no trailing commas.
2. Each day has an activities array. If city changed from previous day, add transport activity FIRST: {type:"transport", title:"Flight/Train to [City]", description:"[Airline] [Code] dep [HH:MM] → arr [HH:MM]" or "[Train Name] [Number] ([Class]) dep [HH:MM] → arr [HH:MM]", time:"HH:MM", duration:"Xh Ym", cost:Number}.
3. Use REAL codes: Delhi→Mumbai: 6E-2116/6E-2647/UK-917/AI-865 | Rajdhani 12952(2A). Delhi→Bangalore: 6E-2191/6E-6036/AI-509 | Rajdhani 22691(2A). Delhi→Goa: 6E-2072/6E-5467/SG-325. Mumbai→Goa: 6E-6134/6E-5261/SG-673 | Jan Shatabdi 12051(CC). Mumbai→Jaipur: 6E-6358/UK-731/AI-647 | 12955(SL). Mumbai→Bangalore: 6E-5072/6E-2175/AI-614 | 16529(SL). Delhi→Jaipur: 6E-6231/UK-627 | Shatabdi 12015(CC). Delhi→Kolkata: 6E-2507/UK-705/AI-701 | 12302(2A). Delhi→Hyderabad: 6E-2841/AI-839 | 12724(2A). Mumbai→Kolkata: 6E-5053/UK-781 | 12859(SL). Any other route: pick plausible 6E-xxxx/UK-xxx/AI-xxx.
4. Local transport (auto,bus,walk) goes in tips notes, NOT as activities.
5. Budget must sum correctly across all days.
6. Include 3-5 activities per day with real places, real timings, real costs in INR.
7. "location" must ALWAYS be a plain string like "Manali, India". NEVER use GeoJSON objects.`;

    const result = await generateAIJson(userPrompt, systemPrompt);
    const trip = result.data as Record<string, unknown>;

    if (!trip) throw new Error('AI returned empty response');

    const totalCost = Number(trip.totalCost ?? 0);
    const maxAllowed = flexibleBudget ? budget * 1.10 : budget;
    if (totalCost > maxAllowed) {
      trip.totalCost = budget;
    }

    const rawDays = (trip.itinerary ?? trip.days ?? []) as Record<string, unknown>[];
    const normalisedDays = rawDays.map((d, i) => ({
      dayNumber: d.dayNumber ?? d.day ?? i + 1,
      date: d.date ?? '',
      theme: d.theme ?? '',
      summary: d.summary ?? '',
      totalCost: d.totalCost ?? 0,
      activities: (d.activities as any[] ?? []).map((act: any) => ({
        ...act,
        location: typeof act.location === 'string'
          ? act.location
          : act.location?.coordinates
            ? `${act.lat ?? ''}, ${act.lng ?? ''}`
            : String(act.location ?? ''),
      })),
    }));

    const rawGuide = trip.transportGuide as Record<string, unknown> | undefined;
    const normalisedGuide = rawGuide ? {
      overview: rawGuide.overview ?? rawGuide.details ?? '',
      primaryRoute: rawGuide.primaryRoute ?? rawGuide.legs ?? [],
      totalTransportCost: rawGuide.totalTransportCost ?? 0,
      tips: rawGuide.tips ?? [],
    } : null;

    const rawBudget = (trip.budget ?? trip.budgetBreakdown ?? {}) as Record<string, unknown>;
    const normalisedBudget = {
      total: rawBudget.total ?? budget,
      actualCost: rawBudget.actualCost ?? rawBudget.total ?? budget,
      transport: rawBudget.transport ?? 0,
      accommodation: rawBudget.accommodation ?? 0,
      food: rawBudget.food ?? 0,
      activities: rawBudget.activities ?? 0,
      miscellaneous: rawBudget.misc ?? rawBudget.miscellaneous ?? 0,
      emergencyFund: rawBudget.emergencyFund ?? 0,
      perDay: rawBudget.perDay ?? Math.round(Number(budget) / duration),
      perPerson: rawBudget.perPerson ?? Math.round(Number(budget) / (Number(travelers) || 1)),
      breakdown: rawBudget.breakdown ?? [],
    };

    const itineraryPayload = {
      title: trip.title ?? null,
      summary: trip.summary ?? null,
      days: normalisedDays,
      hotels: trip.hotels ?? [],
      restaurants: trip.restaurants ?? [],
      hiddenGems: trip.hiddenGems ?? [],
      transportGuide: normalisedGuide,
      seasonalTips: trip.seasonalTips ?? [],
      localPhrases: trip.localPhrases ?? [],
      crowdPrediction: trip.crowdPrediction ?? null,
    };

    const newTrip = await prisma.trip.create({
      data: {
        userId: session.user.id,
        title: String(trip.title ?? `Trip to ${destination}`),
        origin,
        destination,
        startDate: startD,
        endDate: endD,
        duration,
        travelers: Number(travelers) || 1,
        purpose,
        budget: Number(budget),
        currency,
        foodPref: foodPreference,
        hotelPref: hotelPreference,
        transportPref: transportPreferences ?? [],
        itinerary: itineraryPayload,
        budgetBreakdown: normalisedBudget,
        packingList: trip.packingList ?? undefined,
        weatherInfo: trip.weatherForecast ?? trip.weatherInfo ?? undefined,
        safetyInfo: trip.safety ?? trip.safetyInfo ?? undefined,
        status: 'PLANNING',
      },
    });

    return NextResponse.json({
      success: true,
      tripId: newTrip.id,
      aiProvider: result.provider,
    });
  } catch (error: unknown) {
    console.error('[Generate Trip]', error);
    const message = error instanceof Error ? error.message : 'Failed to generate trip';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
