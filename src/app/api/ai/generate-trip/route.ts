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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      origin, destination, startDate, endDate, budget, travelers, currency,
      purposes, foodPreference, hotelPreference, transportPreferences,
      specialRequests, includeHiddenGems, smartBudget,
    } = body;

    if (!destination || !startDate || !endDate || !budget) {
      return NextResponse.json(
        { error: "Destination, dates, and budget are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days < 1 || days > 30) {
      return NextResponse.json(
        { error: "Trip must be between 1 and 30 days" },
        { status: 400 }
      );
    }

    // Handle multiple purposes
    const purposesList = Array.isArray(purposes) && purposes.length > 0 ? purposes : ["BACKPACKING"];
    const primaryPurpose = purposesList[0];
    const purposesStr = purposesList.join(" + ");

    const transportStr = Array.isArray(transportPreferences) && transportPreferences.length > 0
      ? transportPreferences.join(", ")
      : "any available transport";

    const specialInstruction = specialRequests?.trim()
      ? `\n\n⚠️ CRITICAL — Special Requests from the user: "${specialRequests.trim()}"\nYou MUST incorporate these into the itinerary. Add specific activities, visits, or stops for these requests. Do NOT ignore them.`
      : "";

    const systemPrompt = `You are an expert travel planner AI. You create detailed, realistic, budget-accurate trip plans.
You MUST respond with valid JSON only. No markdown, no explanation, no code blocks — just raw JSON.
All costs should be in ${currency || "INR"} currency.`;

    const prompt = `Create a detailed ${days}-day trip plan for ${destination}.IMPORTANT: You MUST generate ALL ${days} days. Do NOT stop early. Do NOT skip any day. Each day must have 4-6 activities.

Trip Details:
- Origin: ${origin || "Not specified"}
- Start Date: ${startDate}
- End Date: ${endDate}
- Total Budget: ${budget} ${currency || "INR"} (for ${travelers || 1} traveler${Number(travelers) > 1 ? "s" : ""})
- Trip Purposes: ${purposesStr}
- Food Preference: ${foodPreference || "No preference"}
- Accommodation Type: ${hotelPreference || "Standard"}
- Preferred Transport: ${transportStr}
- Include Hidden Gems: ${includeHiddenGems ? "Yes" : "No"}
- Smart Budget Mode: ${smartBudget ? "Yes — transport and hotel are already optimized for this budget" : "No"}
 ${specialInstruction}

Return ONLY this JSON structure (no other text):
{
  "destination": "${destination}",
  "totalDays": ${days},
  "itinerary": [
    {
      "day": 1,
      "date": "${startDate}",
      "theme": "Theme of the day",
      "activities": [
        {
          "time": "09:00",
          "title": "Activity name",
          "description": "Detailed description of what to do",
          "location": "Exact place name",
          "cost": 0,
          "type": "attraction",
          "tips": "Optional tip"
        }
      ]
    }
  ],
  "hotels": [
    {
      "name": "Hotel Name",
      "area": "Neighborhood",
      "pricePerNight": 0,
      "rating": 4.5,
      "description": "Why this hotel is good",
      "bookingTip": "Tip for getting best rate"
    }
  ],
  "restaurants": [
    {
      "name": "Restaurant Name",
      "cuisine": "Type of food",
      "diet": "${foodPreference || "all"}",
      "priceRange": "$$",
      "rating": 4.5,
      "mustTry": "Best dish to order",
      "location": "Area/address"
    }
  ],
  "budgetBreakdown": {
    "accommodation": 0,
    "food": 0,
    "transport": 0,
    "activities": 0,
    "misc": 0,
    "total": 0
  },
  "hiddenGems": [
    {
      "name": "Place name",
      "description": "What makes it special",
      "whySpecial": "Why tourists miss it",
      "howToReach": "Directions"
    }
  ],
  "safetyInfo": {
    "overallScore": 8,
    "tips": ["Tip 1", "Tip 2"],
    "emergencyNumber": "911",
    "scamAlerts": ["Common scam to watch for"],
    "safeAreas": ["Area 1"],
    "avoidAreas": ["Area to avoid"]
  },
  "weather": {
    "expected": "Expected weather description",
    "avgTemp": "25°C",
    "tips": ["Weather tip 1"]
  },
  "packingList": [
    {
      "item": "Item name",
      "reason": "Why you need it",
      "essential": true
    }
  ]
}

IMPORTANT RULES:
1. Every day must have 4-6 activities covering morning, afternoon, and evening
2. Total budget in budgetBreakdown must NOT exceed ${budget} ${currency || "INR"}
3. Include at least 2 hotels matching "${hotelPreference || "Standard"}" preference
4. Include at least 3 restaurants that serve ${foodPreference || "any"} food
5. Activities should have realistic costs in ${currency || "INR"} based on ${destination}
6. Use ${transportStr} as preferred transport where possible
7. Include transport costs between locations
8. ${includeHiddenGems ? "Include at least 2 hidden gems" : "No hidden gems needed"}
9. The trip should blend these purposes: ${purposesStr}. Design activities that combine these themes naturally.`;
    
    console.log("Generating trip with AI fallback (z.ai → Groq → Gemini)...");

    let tripData: any;
    let provider: string;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      const result = await generateAIJson(prompt, systemPrompt);
      tripData = result.data;
      provider = result.provider;

      // Validate: check if we got all days
      const generatedDays = Array.isArray(tripData?.itinerary) ? tripData.itinerary.length : 0;

      if (generatedDays >= Math.min(days, 2)) {
        // Good response - has at least 2 days (or all days for short trips)
        console.log(`Trip generated successfully via ${provider}! Got ${generatedDays} days.`);
        break;
      }

      // Incomplete response - retry
      retryCount++;
      console.warn(`Attempt ${retryCount}: AI returned only ${generatedDays}/${days} days. Retrying...`);

      if (retryCount > maxRetries) {
        console.warn(`Max retries reached. Using ${generatedDays}-day response.`);
        break;
      }
    }
    
    const trip = await prisma.trip.create({
      data: {
        userId: session.user.id,
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
        packingList: tripData.packingList || [],
        weatherInfo: tripData.weather || {},
        safetyInfo: tripData.safetyInfo || {},
      },
    });

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
    console.error("Trip generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate trip. Please try again." },
      { status: 500 }
    );
  }
}
