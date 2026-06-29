import { NextRequest, NextResponse } from 'next/server';
import { generateAIJson } from '@/lib/ai';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { findTrains, formatTrainsForPrompt } from '@/lib/trains/findTrains';

export const runtime    = 'nodejs';
export const maxDuration = 10;

const VALID_PURPOSES = [
  'ADVENTURE', 'DEVOTIONAL', 'HIKING', 'HONEYMOON', 'FAMILY',
  'PHOTOGRAPHY', 'BUSINESS', 'FOOD_EXPLORATION', 'WELLNESS',
  'CULTURAL', 'SOLO', 'BACKPACKING',
] as const;

const PURPOSE_LABEL: Record<string, string> = {
  ADVENTURE:       'adventure and thrill-seeking',
  DEVOTIONAL:      'religious/devotional visits and spiritual experiences',
  HIKING:          'trekking and nature hiking',
  HONEYMOON:       'romantic honeymoon experiences',
  FAMILY:          'family-friendly activities suitable for all ages',
  PHOTOGRAPHY:     'photography — golden hours, landscapes, architecture',
  BUSINESS:        'business travel with efficient scheduling',
  FOOD_EXPLORATION:'food exploration and culinary discovery',
  WELLNESS:        'wellness, yoga, meditation, and relaxation',
  CULTURAL:        'cultural immersion, museums, local heritage',
  SOLO:            'solo travel with safety and social opportunities',
  BACKPACKING:     'budget backpacking',
};

const FOOD_LABEL: Record<string, string> = {
  VEG:     'strictly vegetarian (no meat, fish, or eggs)',
  JAIN:    'Jain diet (no root vegetables like onion, garlic, potato)',
  VEGAN:   'fully vegan (no animal products)',
  HALAL:   'halal-certified food only',
  NON_VEG: 'any cuisine including non-vegetarian',
};

function safePurpose(value: unknown) {
  return typeof value === 'string' && VALID_PURPOSES.includes(value as any)
    ? value
    : 'CULTURAL';
}

/* ─────────────────────────────────────────────────────────────────────────
   SERVER-SIDE GEOCODING
   Runs after AI generation, before Prisma save.
   Nominatim is called from the Node.js server — never blocked by Vercel Edge.
   Fills in lat/lng on every activity that has lat:0 or lng:0.
───────────────────────────────────────────────────────────────────────── */
const geoCache = new Map<string, { lat: number; lng: number } | null>();

async function serverGeocode(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  const key = query.toLowerCase().trim();
  if (geoCache.has(key)) return geoCache.get(key)!;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'WandrAI/1.0 (wandr-inky.vercel.app)',
        'Accept-Language': 'en',
      },
    });
    if (!res.ok) { geoCache.set(key, null); return null; }
    const data = await res.json();
    if (!data?.[0])  { geoCache.set(key, null); return null; }
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geoCache.set(key, result);
    return result;
  } catch {
    geoCache.set(key, null);
    return null;
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Geocodes every activity/hotel/restaurant in the AI output that has
 * lat:0 or lng:0 (AI placeholder).
 * Mutates the days array in-place and returns it.
 */
async function geocodeItinerary(
  days: any[],
  destination: string
): Promise<any[]> {
  let reqCount = 0;

  for (const day of days) {
    const activities: any[] = day.activities || day.stops || day.items || [];
    for (const act of activities) {
      const hasCoords =
        Number(act.lat) !== 0  && Number(act.lng) !== 0 &&
        !isNaN(Number(act.lat)) && !isNaN(Number(act.lng));

      if (!hasCoords) {
        // Build the best possible query:
        // Use the location string (e.g. "Taj Mahal, Agra") if available,
        // otherwise fall back to title + destination
        const locStr = typeof act.location === 'string' ? act.location : '';
        const query  = locStr
          ? `${locStr}, ${destination}`
          : `${act.title || act.name || ''}, ${destination}`;

        if (!query.trim() || query.trim() === `, ${destination}`) continue;

        if (reqCount > 0) await sleep(1100); // Nominatim 1 req/sec
        reqCount++;

        const geo = await serverGeocode(query);
        if (geo) {
          act.lat = geo.lat;
          act.lng = geo.lng;
          // Also write to nested location object if present
          if (act.location && typeof act.location === 'object') {
            act.location.lat = geo.lat;
            act.location.lng = geo.lng;
          }
          console.log(`[geocode] ✓ ${query} → ${geo.lat}, ${geo.lng}`);
        } else {
          console.warn(`[geocode] ✗ Not found: ${query}`);
        }
      }
    }
  }

  return days;
}

/* ─────────────────────────────────────────────────────────────────────── */

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

    const startD   = new Date(startDate);
    const endD     = new Date(endDate);
    const duration = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000));

    // Look up real Indian Railways trains for this route (major cities only —
    // see src/lib/trains/cityStationMap.ts). When available, these are
    // injected into the prompt so the AI picks a REAL train number/name/timing
    // instead of inventing one, the same way it currently invents flight numbers.
    const realTrains = await findTrains(origin, destination);
    const trainPromptBlock = formatTrainsForPrompt(realTrains);

    const systemPrompt = `Expert travel planner. Return ONLY valid JSON, no markdown. Costs in ${currency ?? 'INR'}. Food: ${FOOD_LABEL[foodPreference] ?? 'any'}. Style: ${PURPOSE_LABEL[purpose] ?? purpose ?? 'general travel'}. Hotel: ${hotelPreference}.`;

    const userPrompt = `${duration}-day ${destination} trip. Budget: ${budget} ${currency ?? 'INR'}, ${travelers ?? 1} traveler(s), ${startDate} to ${endDate}. Transport pref: ${(transportPreferences ?? []).join('/') || 'any'}.${specialRequests ? ` Notes: ${specialRequests}.` : ''}
${trainPromptBlock ? `\n${trainPromptBlock}\n` : ''}
STRICT JSON (no markdown, no text):
{"destination":"${destination}","title":"...","summary":"2-3 lines","totalDays":${duration},"itinerary":[{"day":1,"date":"${startDate}","theme":"Theme","activities":[{"time":"06:00-08:15","type":"TRANSPORT","title":"Flight: ${origin} to ${destination}","description":"IndiGo 6E-204 · T2 Departure · Arrives T1","location":"${origin} Airport","lat":28.5562,"lng":77.1000,"cost":0,"duration":135,"notes":"Reach airport 2hrs early"},{"time":"09:00","type":"SIGHTSEEING","title":"Visit Place","description":"Details","location":"Exact Place Name, ${destination}","lat":11.6234,"lng":92.7265,"cost":0,"duration":90,"notes":"tip"}]}],"hotels":[{"name":"Hotel Name","area":"Area","lat":11.6234,"lng":92.7265,"pricePerNight":2000,"rating":4,"amenities":["WiFi"],"diet":"${foodPreference || 'all'}"}],"restaurants":[{"name":"Restaurant Name","cuisine":"Food type","diet":"${foodPreference || 'all'}","lat":11.6234,"lng":92.7265,"pricePerPerson":300,"rating":4,"mustTry":["dish"]}],"hiddenGems":[{"name":"Offbeat Spot","description":"Why it's special","lat":11.6234,"lng":92.7265,"when":"Early morning","cost":0}],"transportGuide":{"overview":"Brief transport overview","legs":[{"from":"${origin}","to":"${destination}","mode":"${(transportPreferences ?? ['FLIGHT'])[0]}","duration":"2h","cost":0,"operator":"Airline/Railway","vehicleNo":"6E-204","vehicle":"A320neo"}]},"budgetBreakdown":{"accommodation":0,"food":0,"transport":0,"activities":0,"misc":0,"total":${budget}},"packingList":[{"item":"Comfortable shoes","reason":"For walking","category":"clothing","essential":true}],"weatherForecast":{"expected":"Pleasant","avgTemp":"28°C","tips":["Carry water"],"forecast":[{"date":"${startDate}","condition":"Sunny","high":32,"low":22}]},"safety":{"overallScore":8,"tips":["Stay aware"],"emergencyNumber":"112","scamAlerts":["Common scam"],"hospitals":[{"name":"Nearest Hospital","distance":"2km","phone":"0"}]}}

RULES:
1. Return ONLY valid JSON. No markdown fences, no comments, no trailing commas.
2. Each day has an activities array. If city changed from previous day, add transport activity FIRST: {type:"transport", title:"Flight/Train to [City]", description:"[Airline] [Code] dep [HH:MM] → arr [HH:MM]" or "[Train Name] [Number] ([Class]) dep [HH:MM] → arr [HH:MM]", time:"HH:MM", duration:"Xh Ym", cost:Number}.
3. If real trains were given above, use one of THOSE EXACTLY for any train leg — do not invent a different train number/name/timing for this route. If no real trains were given, or the user prefers flights, use REAL flight codes: Delhi→Mumbai: 6E-2116/6E-2647/UK-917/AI-865 | Rajdhani 12952(2A). Delhi→Bangalore: 6E-2191/6E-6036/AI-509 | Rajdhani 22691(2A). Delhi→Goa: 6E-2072/6E-5467/SG-325. Mumbai→Goa: 6E-6134/6E-5261/SG-673 | Jan Shatabdi 12051(CC). Mumbai→Jaipur: 6E-6358/UK-731/AI-647 | 12955(SL). Mumbai→Bangalore: 6E-5072/6E-2175/AI-614 | 16529(SL). Delhi→Jaipur: 6E-6231/UK-627 | Shatabdi 12015(CC). Delhi→Kolkata: 6E-2507/UK-705/AI-701 | 12302(2A). Delhi→Hyderabad: 6E-2841/AI-839 | 12724(2A). Mumbai→Kolkata: 6E-5053/UK-781 | 12859(SL). Any other route: pick plausible 6E-xxxx/UK-xxx/AI-xxx.
4. Local transport (auto,bus,walk) goes in tips notes, NOT as activities.
5. Budget must sum correctly across all days.
6. Include 3-5 activities per day with real places, real timings, real costs in INR.
7. "location" must ALWAYS be a plain string like "Taj Mahal, Agra". NEVER use GeoJSON objects.
8. CRITICAL: Every activity, hotel, restaurant and hiddenGem MUST have real lat/lng coordinates — the ACTUAL GPS coordinates of that specific place. NEVER use 0,0. Example: Taj Mahal = lat:27.1751,lng:78.0421 | Gateway of India = lat:18.9220,lng:72.8347 | Hawa Mahal = lat:26.9239,lng:75.8267 | Radhanagar Beach = lat:12.0579,lng:92.9764. Use your knowledge to provide accurate coordinates for every location.`;

    const result = await generateAIJson(userPrompt, systemPrompt);
    const trip   = result.data as Record<string, unknown>;

    if (!trip) throw new Error('AI returned empty response');

    const totalCost  = Number(trip.totalCost ?? 0);
    const maxAllowed = flexibleBudget ? budget * 1.10 : budget;
    if (totalCost > maxAllowed) { trip.totalCost = budget; }

    const rawDays = (trip.itinerary ?? trip.days ?? []) as Record<string, unknown>[];

    // ── Normalise day/activity shapes ──
    let normalisedDays = rawDays.map((d, i) => ({
      dayNumber:  d.dayNumber ?? d.day ?? i + 1,
      date:       d.date ?? '',
      theme:      d.theme ?? '',
      summary:    d.summary ?? '',
      totalCost:  d.totalCost ?? 0,
      activities: ((d.activities as any[]) ?? []).map((act: any) => ({
        ...act,
        location: typeof act.location === 'string'
          ? act.location
          : act.location?.coordinates
            ? `${act.lat ?? ''}, ${act.lng ?? ''}`
            : String(act.location ?? ''),
      })),
    }));

    /* ── GEOCODE: fill in real lat/lng before saving ──
       This runs server-side so Nominatim is never blocked.
       For a 3-day / 12-stop trip, adds ~13s — acceptable at generation time.
       The map will then render immediately from stored coords, no geocoding needed
       on the client at all. */
    console.log('[generate-trip] Starting server-side geocoding...');
    normalisedDays = await geocodeItinerary(normalisedDays, destination);
    console.log('[generate-trip] Geocoding complete.');

    const rawGuide       = trip.transportGuide as Record<string, unknown> | undefined;
    const normalisedGuide = rawGuide ? {
      overview:            rawGuide.overview ?? rawGuide.details ?? '',
      primaryRoute:        rawGuide.primaryRoute ?? rawGuide.legs ?? [],
      totalTransportCost:  rawGuide.totalTransportCost ?? 0,
      tips:                rawGuide.tips ?? [],
    } : null;

    const rawBudget       = (trip.budget ?? trip.budgetBreakdown ?? {}) as Record<string, unknown>;
    const normalisedBudget = {
      total:         rawBudget.total ?? budget,
      actualCost:    rawBudget.actualCost ?? rawBudget.total ?? budget,
      transport:     rawBudget.transport ?? 0,
      accommodation: rawBudget.accommodation ?? 0,
      food:          rawBudget.food ?? 0,
      activities:    rawBudget.activities ?? 0,
      miscellaneous: rawBudget.misc ?? rawBudget.miscellaneous ?? 0,
      emergencyFund: rawBudget.emergencyFund ?? 0,
      perDay:        rawBudget.perDay ?? Math.round(Number(budget) / duration),
      perPerson:     rawBudget.perPerson ?? Math.round(Number(budget) / (Number(travelers) || 1)),
      breakdown:     rawBudget.breakdown ?? [],
    };

    const itineraryPayload = {
      title:         trip.title ?? null,
      summary:       trip.summary ?? null,
      days:          normalisedDays,   // ← now includes real lat/lng
      hotels:        trip.hotels ?? [],
      restaurants:   trip.restaurants ?? [],
      hiddenGems:    trip.hiddenGems ?? [],
      transportGuide: normalisedGuide,
      seasonalTips:  trip.seasonalTips ?? [],
      localPhrases:  trip.localPhrases ?? [],
      crowdPrediction: trip.crowdPrediction ?? null,
    };

    const newTrip = await prisma.trip.create({
      data: {
        userId:        session.user.id,
        title:         String(trip.title ?? `Trip to ${destination}`),
        origin,
        destination,
        startDate:     startD,
        endDate:       endD,
        duration,
        travelers:     Number(travelers) || 1,
        purpose:       safePurpose(purpose) as any,
        budget:        Number(budget),
        currency,
        foodPref:      foodPreference,
        hotelPref:     hotelPreference,
        transportPref: transportPreferences ?? [],
        itinerary:     itineraryPayload,
        budgetBreakdown: normalisedBudget,
        packingList:   trip.packingList ?? undefined,
        weatherInfo:   trip.weatherForecast ?? trip.weatherInfo ?? undefined,
        safetyInfo:    trip.safety ?? trip.safetyInfo ?? undefined,
        status:        'PLANNING',
      },
    });

    return NextResponse.json({
      success:    true,
      tripId:     newTrip.id,
      aiProvider: result.provider,
    });
  } catch (error: unknown) {
    console.error('[Generate Trip]', error);
    const message = error instanceof Error ? error.message : 'Failed to generate trip';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
