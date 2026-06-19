import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAIJson } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tripId, reason, currentItinerary } = await req.json();

    if (!tripId || !reason) {
      return NextResponse.json(
        { error: "Trip ID and reason are required" },
        { status: 400 }
      );
    }

    // Verify trip belongs to user
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId: session.user.id },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const prompt = `You are a travel planner AI. The user wants to replan part of their trip.

Trip: ${trip.destination}
Dates: ${trip.startDate} to ${trip.endDate}
Budget: ${trip.budget}
Travelers: ${trip.travelers}
Diet: ${trip.diet}

Current itinerary:
 ${JSON.stringify(currentItinerary || trip.itinerary, null, 2)}

Replan reason: "${reason}"

Return ONLY this JSON with the UPDATED full itinerary:
{
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Theme of the day",
      "activities": [
        {
          "time": "09:00",
          "title": "Activity",
          "description": "Details",
          "location": "Place",
          "cost": 0,
          "type": "attraction",
          "tips": "Optional"
        }
      ]
    }
  ],
  "changesMade": "Brief description of what changed and why",
  "budgetImpact": "How the budget is affected"
}

Keep the same structure. Only modify what's necessary for the replan reason. Stay within the original budget of ${trip.budget}.`;

    const result = await generateAIJson(prompt);

    // Update trip in database
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        itinerary: result.itinerary || trip.itinerary,
      },
    });

    return NextResponse.json({
      success: true,
      itinerary: result.itinerary,
      changesMade: result.changesMade,
      budgetImpact: result.budgetImpact,
    });
  } catch (error: any) {
    console.error("Replan error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to replan trip" },
      { status: 500 }
    );
  }
}
