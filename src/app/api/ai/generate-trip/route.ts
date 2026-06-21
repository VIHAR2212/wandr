import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAIJson } from "@/lib/ai";
import { TripPurpose, FoodPreference } from "@prisma/client";

function mapPurpose(purpose: string): TripPurpose {
  const map: Record<string, TripPurpose> = {
    ADVENTURE: "ADVENTURE", DEVOTIONAL: "DEVOTIONAL", HIKING: "HIKING",
    HONEYMOON: "HONEYMOON", FAMILY: "FAMILY", PHOTOGRAPHY: "PHOTOGRAPHY",
    BUSINESS: "BUSINESS", FOOD_EXPLORATION: "FOOD_EXPLORATION", WELLNESS: "WELLNESS",
    CULTURAL: "CULTURAL", SOLO: "SOLO", BACKPACKING: "BACKPACKING",
  };
  return map[purpose] || "BACKPACKING";
}

function mapFoodPref(diet?: string): FoodPreference {
  const map: Record<string, FoodPreference> = {
    veg: "VEG", vegetarian: "VEG", jain: "JAIN", vegan: "VEGAN",
    halal: "HALAL", non_veg: "NON_VEG", "non-veg": "NON_VEG",
    nonveg: "NON_VEG", non: "NON_VEG", meat: "NON_VEG",
  };
  return map[(diet || "").toLowerCase().trim()] || "NON_VEG";
}

export async function POST(req: NextRequest) {
  try {
    let userId: string | undefined;
    try {
      const session = await auth();
      userId = session?.user?.id;
    } catch (authError) {
      return NextResponse.json({ error: "Auth service error." }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      origin, destination, startDate, endDate, budget, travelers, currency,
      purposes, foodPreference, hotelPreference, transportPreferences,
      specialRequests,
    } = body;

    if (!destination || !startDate || !endDate || !budget) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days < 1 || days > 30) {
      return NextResponse.json({ error: "Trip must be 1-30 days" }, { status: 400 });
    }

    const purposesList = Array.isArray(purposes) && purposes.length > 0 ? purposes : ["BACKPACKING"];
    const primaryPurpose = purposesList[0];
    const purposesStr = purposesList.join(" + ");
    const specialInstruction = specialRequests?.trim() ? `\nCRITICAL Special Request: "${specialRequests.trim()}" - You MUST include this.` : "";

    const systemPrompt = `You are an expert travel planner. Respond ONLY with valid JSON. No markdown, no text, just raw JSON. All costs in ${currency || "INR"}.`;

    const prompt = `Create a ${days}-day trip for ${destination}. Budget: ${budget} ${currency || "INR"} for ${travelers || 1} person(s). Food: ${foodPreference || "Any"}. Hotel: ${hotelPreference || "Standard"}. Purpose: ${purposesStr}. ${specialInstruction}

Return STRICTLY this JSON (no other text):
{
  "destination": "${destination}",
  "totalDays": ${days},
  "itinerary": [
    {
      "day": 1, "date": "${startDate}", "theme": "Theme",
      "activities": [
        {"time": "09:00", "title": "Visit Place", "description": "Details", "location": "Exact Place Name", "lat": 19.076, "lng": 72.877, "cost": 500, "type": "attraction", "tips": "Tip"}
      ]
    }
  ],
  "hotels": [{"name": "Hotel Name", "area": "Area", "lat": 19.08, "lng": 72.88, "pricePerNight": 2000, "rating": 4.5, "description": "Good hotel", "bookingTip": "Book early"}],
  "restaurants": [{"name": "Restaurant Name", "cuisine": "Food type", "diet": "${foodPreference || "all"}", "priceRange": "$$", "rating": 4.5, "mustTry": "Best dish", "location": "Area", "lat": 19.09, "lng": 72.89}],
  "budgetBreakdown": {"accommodation": 0, "food": 0, "transport": 0, "activities": 0, "misc": 0, "total": ${budget}}
}

RULES:
1. Generate EXACTLY ${days} days.
2. Each day MUST have 4-6 activities.
3. Total budget MUST equal ${budget}.
4. Provide 2 hotels and 3 restaurants.
5. CRITICAL: You MUST provide accurate decimal "lat" and "lng" for EVERY activity, hotel, and restaurant.`;

    console.log("🔄 Generating trip with 4-Groq fallback system...");

    let tripData: any = null;
    let provider: string = 'unknown';
    let retryCount = 0;

    while (retryCount <= 2) {
      const result = await generateAIJson(prompt, systemPrompt);
      if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data)) {
        throw new Error("Invalid data structure");
      }

      tripData = result.data;
      provider = result.provider;
      const generatedDays = Array.isArray(tripData?.itinerary) ? tripData.itinerary.length : 0;

      if (generatedDays >= Math.min(days, 2)) {
        console.log(`✅ Trip generated via ${provider}! Got ${generatedDays} days.`);
        break;
      }
      retryCount++;
    }
    
    let trip;
    try {
      trip = await prisma.trip.create({
        data: {
          userId: userId,
          title: `Trip to ${destination}`,
          origin: origin || "Not specified",
          destination: tripData.destination || destination,
          startDate: start,
          endDate: end,
          duration: days,
          travelers: Number(travelers) || 1,
          purpose: mapPurpose(primaryPurpose),
          budget: Number(budget),
          currency: currency || "INR",
          foodPref: mapFoodPref(foodPreference),
          hotelPref: (hotelPreference || "STANDARD").toUpperCase(),
          transportPref: Array.isArray(transportPreferences) ? transportPreferences : [],
          itinerary: {
            days: tripData.itinerary || [],
            hotels: tripData.hotels || [],
            restaurants: tripData.restaurants || [],
            hiddenGems: tripData.hiddenGems || [],
            purposes: purposesList,
            specialRequests: specialRequests || "",
          },
          budgetBreakdown: tripData.budgetBreakdown || {},
          packingList: tripData.packingList || [{ item: "Comfortable shoes", reason: "For walking", essential: true }],
          weatherInfo: tripData.weather || { expected: "Pleasant", avgTemp: "28°C", tips: ["Carry water"] },
          safetyInfo: tripData.safetyInfo || { overallScore: 8, tips: ["Stay aware"], emergencyNumber: "112", scamAlerts: [], safeAreas: [], avoidAreas: [] },
        },
      });
    } catch (dbError: any) {
      console.error("💥 Database Error:", dbError);
      return NextResponse.json({ error: `Database failed: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tripId: trip.id,
      trip: {
        ...trip,
        itinerary: tripData.itinerary || [],
        hotels: tripData.hotels || [],
        restaurants: tripData.restaurants || [],
        hiddenGems: tripData.hiddenGems || [],
        weather: tripData.weather || {},
        purposes: purposesList,
      },
      provider,
    });
  } catch (error: any) {
    console.error("💥 Trip generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate trip." }, { status: 500 });
  }
}
