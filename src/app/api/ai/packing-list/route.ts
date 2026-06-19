import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAIJson } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { destination, days, purpose, season } = await req.json();

    if (!destination || !days) {
      return NextResponse.json(
        { error: "Destination and days are required" },
        { status: 400 }
      );
    }

    const prompt = `Generate a packing list for a ${days}-day trip to ${destination}.
Purpose: ${purpose || "leisure"}
Season/Weather: ${season || "not specified"}

Return ONLY this JSON:
{
  "essentials": [
    { "item": "Passport", "reason": "Required for international travel", "checked": false }
  ],
  "clothing": [
    { "item": "T-shirt", "reason": "Comfortable for daytime", "quantity": 3, "checked": false }
  ],
  "toiletries": [
    { "item": "Toothbrush", "reason": "Personal hygiene", "checked": false }
  ],
  "electronics": [
    { "item": "Phone charger", "reason": "Keep devices powered", "checked": false }
  ],
  "misc": [
    { "item": "First aid kit", "reason": "Basic health supplies", "checked": false }
  ],
  "destinationSpecific": [
    { "item": "Adapter plug", "reason": "Outlet type may differ", "checked": false }
  ]
}

Be thorough but practical. Include 3-6 items per category.`;

    const packingList = await generateAIJson(prompt);

    return NextResponse.json({ success: true, packingList });
  } catch (error: any) {
    console.error("Packing list error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate packing list" },
      { status: 500 }
    );
  }
}
