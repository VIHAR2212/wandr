import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAIJson } from "@/lib/ai";
import { TripPurpose, FoodPreference } from "@prisma/client";

// Map frontend string to database enum
function mapPurpose(purpose?: string): TripPurpose {
  const map: Record<string, TripPurpose> = {
    adventure: "ADVENTURE",
    devotional: "DEVOTIONAL",
    hiking: "HIKING",
    honeymoon: "HONEYMOON",
    family: "FAMILY",
    photography: "PHOTOGRAPHY",
    business: "BUSINESS",
    food: "FOOD_EXPLORATION",
    food_exploration: "FOOD_EXPLORATION",
    wellness: "WELLNESS",
    cultural: "CULTURAL",
    solo: "SOLO",
    backpacking: "BACKPACKING",
    leisure: "BACKPACKING",
    relaxing: "WELLNESS",
    holiday: "FAMILY",
    vacation: "FAMILY",
    trip: "BACKPACKING",
  };
  return map[(purpose || "leisure").toLowerCase().trim()] || "BACKPACKING";
}

// Map diet string to database enum
function mapFoodPref(diet?: string): FoodPreference {
  const map: Record<string, FoodPreference> = {
    veg: "VEG",
    vegetarian: "VEG",
    jain: "JAIN",
    vegan: "VEGAN",
    halal: "HALAL",
    non_veg: "NON_VEG",
    "non-veg": "NON_VEG",
    nonveg: "NON_VEG",
    non: "NON_VEG",
    meat: "NON_VEG",
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
      destination,
      startDate,
      endDate,
      budget,
      travelers,
      diet,
      purpose,
      interests,
    } = body;

    if (!destination || !startDate || !endDate || !budget) {
      return NextResponse.json(
        { error: "Destination, dates, and budget are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days < 1 || days > 30) {
      return NextResponse.json(
        { error: "Trip must be between 1 and 30 days" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert travel planner AI. You create detailed, realistic, budget-accurate trip plans.
You MUST respond with valid JSON only. No markdown, no explanation, no code blocks — just raw JSON.
All costs should be in the currency implied by the destination or USD if unclear.`;

    const interestStr = interests?.length
      ? interests.join(", ")
      : "general sightseeing, local culture, food";

    const prompt = `Create a detailed ${days}-day trip plan for ${destination}.

Trip Details:
- Start Date: ${startDate}
- End Date: ${endDate}
- Total Budget: ${budget} (for ${travelers || 1} traveler${Number(travelers) > 1 ? "s" : ""})
- Diet Preference: ${diet || "No preference"}
- Trip Purpose: ${purpose || "Leisure"}
- Interests: ${interestStr}

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
      "diet": "${diet || "all"}",
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
2. Total budget in budgetBreakdown must NOT exceed ${budget}
3. Include at least 2 hotels, 3 restaurants, 2 hidden gems
4. Activities should have realistic costs based on ${destination}
5. All restaurant suggestions must respect the diet preference: ${diet || "no restriction"}
6. Include transport costs between locations`;

    // ===== Call AI with fallback: z.ai → Groq → Gemini =====
    console.log("Generating trip with AI fallback (z.ai → Groq → Gemini)...");
    const { data: tripData, provider } = await generateAIJson(prompt, systemPrompt);
    console.log(`Trip generated successfully via ${provider}!`);

    // ===== Save to database — fields match Prisma schema exactly =====
    const trip = await prisma.trip.create({
      data: {
        userId: session.user.id,
        title: `Trip to ${destination}`,
        origin: "Not specified",
        destination: tripData.destination || destination,
        startDate: start,
        endDate: end,
        duration: days,
        travelers: Number(travelers) || 1,
        purpose: mapPurpose(purpose),
        budget: Number(budget),
        foodPref: mapFoodPref(diet),

        // Hotels, restaurants, hiddenGems bundled inside itinerary JSON
        // (these columns don't exist in DB)
        itinerary: {
          days: tripData.itinerary || [],
          hotels: tripData.hotels || [],
          restaurants: tripData.restaurants || [],
          hiddenGems: tripData.hiddenGems || [],
        },

        // These exist as JSON columns in DB
        budgetBreakdown: tripData.budgetBreakdown || {},
        packingList: tripData.packingList || [],
        weatherInfo: tripData.weather || {},  // Note: "weatherInfo" not "weather"
        safetyInfo: tripData.safetyInfo || {},
      },
    });

    // ===== Return full data to frontend =====
    // Frontend expects top-level hotels, restaurants, etc.
    // so we extract them from the bundled itinerary
    return NextResponse.json({
      success: true,
      tripId: trip.id,
      trip: {
        ...trip,
        // Override itinerary to just be the days array
        itinerary: tripData.itinerary || [],
        // Add these as top-level for frontend
        hotels: tripData.hotels || [],
        restaurants: tripData.restaurants || [],
        hiddenGems: tripData.hiddenGems || [],
        weather: tripData.weather || {},
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
