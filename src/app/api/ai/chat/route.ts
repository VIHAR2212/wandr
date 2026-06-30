import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAIResponse } from "@/lib/ai";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ⚡ Rate limit check
    const rate = checkRateLimit(session.user.id, "CHAT", LIMITS.CHAT);

    if (!rate.allowed) {
      console.log(`🚫 Rate limited user ${session.user.id} (chat). Retry in ${rate.retryAfter}s`);
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Try again in ${Math.ceil(rate.retryAfter! / 60)} minutes.`,
          remaining: rate.remaining,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfter) },
        }
      );
    }

    const { messages, tripContext, tripId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are the Wandr AI Travel Assistant — you ONLY answer questions related to travel, trips, and tourism. You are NOT a general-purpose chatbot.

Trip Context:
 ${JSON.stringify(tripContext, null, 2)}

STRICT RULES:
1. You MUST ONLY answer questions related to this trip, travel planning, destinations, flights, hotels, food, safety, packing, weather, visas, transport, sightseeing, photography spots, local culture, budget tips, or anything travel-related.
2. If the user asks something COMPLETELY UNRELATED to travel or their trip (e.g., coding, math, recipes, politics, jokes, general knowledge, etc.), you MUST politely decline and redirect them back to their trip. Say something like: "I'm your travel assistant — I can only help with trip-related questions! Try asking about your Kerala trip instead. 🧳"
3. Be concise but helpful. Use the trip context to give personalized answers.
4. If they ask about costs, refer to their budget.
5. Suggest nearby places, activities, or food based on their destination.
6. Keep responses to 2-4 sentences unless they ask for a detailed list.`;

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    if (!lastUserMessage) {
      return NextResponse.json(
        { error: "No user message found" },
        { status: 400 }
      );
    }

    const reply = await generateAIResponse(lastUserMessage.content, systemPrompt);

    // Persist both messages so chat history survives navigation/reloads.
    // Best-effort: a save failure shouldn't break the chat response itself.
    if (tripId) {
      try {
        await prisma.chatMessage.createMany({
          data: [
            { tripId, role: "USER", content: lastUserMessage.content },
            { tripId, role: "ASSISTANT", content: reply.content },
          ],
        });
      } catch (saveErr) {
        console.error("Failed to save chat messages:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: reply.content,
      rateLimit: rate.remaining,
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Chat failed" },
      { status: 500 }
    );
  }
}
