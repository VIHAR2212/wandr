import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAIResponse } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, tripContext } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const systemPrompt = tripContext
      ? `You are a helpful travel assistant for Wandr. The user is currently on a trip or planning one.
Here is their trip context:
 ${JSON.stringify(tripContext, null, 2)}

Answer their questions about the trip, suggest changes, recommend nearby places, or help with any travel needs.
Be concise but helpful. If they ask about costs, refer to their budget breakdown.`
      : `You are a helpful travel assistant for Wandr. Help users with travel planning, destination recommendations,
packing tips, visa info, and general travel advice. Be concise and practical.`;

    // Extract conversation history for context
    const conversationHistory = messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // Get the latest user message for the AI call
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    if (!lastUserMessage) {
      return NextResponse.json(
        { error: "No user message found" },
        { status: 400 }
      );
    }

    const reply = await generateAIResponse(lastUserMessage.content, systemPrompt);

    // Return with "message" key to match what TripChat.tsx expects: data.message
    return NextResponse.json({ success: true, message: reply });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Chat failed" },
      { status: 500 }
    );
  }
}
