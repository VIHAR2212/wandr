// src/app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { generateAIJson } from "@/lib/ai";

// Re-implements Twilio's request validation using only Node's built-in
// crypto module — no `twilio` npm package required.
//
// How Twilio's signature works:
// 1. Take the full webhook URL.
// 2. Sort the POST params alphabetically by key, and append each
//    key+value directly (no separators) to the URL string.
// 3. Compute HMAC-SHA1 of that string using your Auth Token as the key.
// 4. Base64-encode the result. This must match the X-Twilio-Signature header.
function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  // Timing-safe comparison
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Twilio sends application/x-www-form-urlencoded, not JSON.
// We need the RAW body string for signature validation, so we
// read it once with req.text() and parse it ourselves.

function twiml(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
    message
  )}</Message></Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  // --- 1. Verify the request actually came from Twilio ---
  const twilioSignature = req.headers.get("x-twilio-signature") ?? "";

  // Must exactly match the URL Twilio is configured to POST to,
  // including https:// and the full path. Set TWILIO_WEBHOOK_BASE_URL
  // in .env.local once you know your real domain (or ngrok URL while testing).
  const webhookUrl = `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/whatsapp/webhook`;

  const isValid = validateTwilioSignature(
    process.env.TWILIO_AUTH_TOKEN as string,
    twilioSignature,
    webhookUrl,
    params
  );

  if (!isValid) {
    console.warn("Rejected WhatsApp webhook: invalid Twilio signature");
    return new NextResponse("Forbidden", { status: 403 });
  }

  // --- 2. Extract the inbound message ---
  const from = params.From ?? ""; // e.g. "whatsapp:+919876543210"
  const body = (params.Body ?? "").trim();
  const phone = from.replace("whatsapp:", "");

  if (!phone || !body) {
    return twiml("Sorry, I didn't receive a valid message.");
  }

  const lowerBody = body.toLowerCase();

  try {
    // --- 3. Find the user by phone number ---
    const user = await prisma.user.findFirst({ where: { phone } });

    if (!user) {
      return twiml(
        "Hey! I don't recognize this number yet. Sign up at wandr-inky.vercel.app and add this phone number to your profile, then message me again 🧳"
      );
    }

// --- Command: "send itinerary" ---
    if (lowerBody.includes("send itinerary") || lowerBody.includes("my itinerary")) {
      const trip = await prisma.trip.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { days: { include: { activities: true }, orderBy: { dayNumber: "asc" } } },
      });

      if (!trip) {
        return twiml("You don't have any trips yet. Head to wandr-inky.vercel.app to plan one!");
      }

      const summary = formatItinerarySummary(trip);
      return twiml(summary);
    }
    
    // --- Phase 4: check if there's an in-progress conversational session ---
    const session = await prisma.whatsapp_sessions.findFirst({ where: { phone } });

    if (session && session.step !== "DONE") {
      return await handleSessionStep(session, body, user.id);
    }


    // --- Command: "plan a trip to X" — starts a new Phase 4 session ---
    const planMatch = lowerBody.match(/plan a trip to (.+)/i);
    if (planMatch) {
      const destination = capitalize(planMatch[1].trim());

      await prisma.whatsapp_sessions.upsert({
        where: { phone },
        create: {
          phone,
          step: "AWAITING_ORIGIN",
          destination,
        },
        update: {
          step: "AWAITING_ORIGIN",
          destination,
          days: null,
          budget: null,
          tripId: null,
          updatedAt: new Date(),
        },
      });

      return twiml(`Got it — planning a trip to ${destination}! 🌍\nWhere are you traveling from?`);
    }

    // --- Default / unrecognized message ---
    return twiml(
      "Hi! I can help with:\n• \"plan a trip to <destination>\"\n• \"send itinerary\"\n\nWhat would you like to do?"
    );
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return twiml("Something went wrong on my end. Please try again in a moment.");
  }
}

function capitalize(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatItinerarySummary(trip: {
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  days: { dayNumber: number; theme: string | null; activities: { time: string; title: string }[] }[];
}) {
  let msg = `🧳 *${trip.title}* — ${trip.destination}\n\n`;
  for (const day of trip.days) {
    msg += `*Day ${day.dayNumber}*\n`;
    for (const act of day.activities) {
      msg += `• ${act.title}\n`;
    }
    msg += "\n";
  }
  const MAX = 1500;
if (msg.length <= MAX) return msg.trim();
// Split at day boundaries
return trip.days.map((day: any) => {
  let d = `🧳 *${trip.title}*\n*Day ${day.dayNumber}*${day.theme ? ` — ${day.theme}` : ""}\n`;
  for (const act of day.activities) d += `  ${act.time} — ${act.title}\n`;
  return d.trim();
}).join("\n\n");
}

// ---------------------------------------------------------------
// Phase 4 — conversational session handling
// ---------------------------------------------------------------

interface WhatsAppSession {
  id: number;
  phone: string;
  step: string;
  origin: string | null;
  destination: string | null;
  days: number | null;
  budget: number | null;
  tripId: string | null;
}

async function handleSessionStep(
  session: WhatsAppSession,
  body: string,
  userId: string
): Promise<NextResponse> {
  const trimmed = body.trim();

  switch (session.step) {
    case "AWAITING_ORIGIN": {
      const origin = capitalize(trimmed);
      if (!origin) {
        return twiml("Please tell me which city you're traveling from.");
      }
      await prisma.whatsapp_sessions.update({
        where: { phone: session.phone },
        data: { step: "AWAITING_DAYS", origin, updatedAt: new Date() },
      });
      return twiml(`Traveling from ${origin} — got it!\nHow many days are you thinking?`);
    }

    case "AWAITING_DAYS": {
      const days = parseInt(trimmed, 10);
      if (isNaN(days) || days < 1 || days > 30) {
        return twiml("Please reply with just a number of days (e.g. \"4\").");
      }
      await prisma.whatsapp_sessions.update({
        where: { phone: session.phone },
        data: { step: "AWAITING_BUDGET", days, updatedAt: new Date() },
      });
      return twiml(`${days} days in ${session.destination} — got it! 💰\nWhat's your total budget? (just the number, e.g. 15000)`);
    }

    case "AWAITING_BUDGET": {
      // Strip common currency symbols/commas so "₹15,000" or "15000" both work
      const cleaned = trimmed.replace(/[^0-9.]/g, "");
      const budget = parseFloat(cleaned);
      if (isNaN(budget) || budget <= 0) {
        return twiml("Please reply with just the budget number (e.g. \"15000\").");
      }

      // We have everything we need — build the trip now.
      await prisma.whatsapp_sessions.update({
        where: { phone: session.phone },
        data: { step: "GENERATING", budget, updatedAt: new Date() },
      });

      try {
        const trip = await createTripFromSession(
          userId,
          session.origin as string,
          session.destination as string,
          session.days as number,
          budget
        );

        await prisma.whatsapp_sessions.update({
          where: { phone: session.phone },
          data: { step: "DONE", tripId: trip.id, updatedAt: new Date() },
        });

        const summary = formatItinerarySummary(trip);
        return twiml(`✅ Your trip is ready!\n\n🧳 *${trip.title}*\n\nView & download your itinerary here:\nhttps://wandr-inky.vercel.app/trip/${trip.id}`);
      } catch (err) {
        console.error("WhatsApp trip generation error:", err);
        // Reset the session so the user can try again rather than getting stuck.
        await prisma.whatsapp_sessions.update({
          where: { phone: session.phone },
          data: { step: "DONE", updatedAt: new Date() },
        });
        return twiml(
          "Sorry, I couldn't generate that trip just now. Try \"plan a trip to <destination>\" again in a moment."
        );
      }
    }

    default:
      // Unknown/stale step — clear it so the user isn't stuck in limbo.
      await prisma.whatsapp_sessions.update({
        where: { phone: session.phone },
        data: { step: "DONE", updatedAt: new Date() },
      });
      return twiml("Let's start over — try \"plan a trip to <destination>\".");
  }
}

function mapActivityType(type: string): string {
  const map: Record<string, string> = {
    sightseeing: "SIGHTSEEING",
    food: "RESTAURANT",
    restaurant: "RESTAURANT",
    transport: "TRANSPORT",
    accommodation: "ACCOMMODATION",
    adventure: "ADVENTURE",
    shopping: "SHOPPING",
    rest: "REST",
    ceremony: "CEREMONY",
    meeting: "MEETING",
  };
  return (map[type?.toLowerCase()] ?? "SIGHTSEEING") as any;
}

async function createTripFromSession(
  userId: string,
  origin: string,
  destination: string,
  days: number,
  budget: number
) {
  const currency = "INR";
  const travelers = 1;

  const systemPrompt =
  "Expert travel planner. Return ONLY valid JSON, no markdown, no preamble, no explanation. " +
  "The JSON object MUST have a top-level key named exactly \"itinerary\" containing an array with one entry per day. " +
  "Each day MUST have a non-empty \"activities\" array with at least 3 activities. Costs in INR.";
const userPrompt = `${days}-day trip from ${origin} to ${destination}. Budget: ${budget} ${currency}, ${travelers} traveler(s).
Return JSON in EXACTLY this shape (top-level key must be "itinerary"):
{"title":"...","summary":"2-3 line summary","itinerary":[{"day":1,"theme":"","summary":"","activities":[{"time":"","title":"","description":"","location":"","cost":0,"type":"sightseeing","duration":60}]}]}
"type" must be one of: sightseeing, food, transport, accommodation, adventure, shopping, rest.`;

const result = await generateAIJson<Record<string, unknown>>(userPrompt, systemPrompt);
const raw = result.data;

if (!raw) throw new Error("AI returned empty response");

const rawDays = (raw.itinerary ?? raw.days ?? raw.itineraryDays ?? []) as Array<Record<string, unknown>>;
console.log("RAW DAYS:", JSON.stringify(rawDays));

if (rawDays.length === 0) {
  console.error("[createTripFromSession] AI response had no itinerary days. Full raw response:", JSON.stringify(raw));
  throw new Error("AI returned no itinerary days — see RAW DAYS / raw response log above.");
}
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + days * 86400000);

  const newTrip = await prisma.trip.create({
    data: {
      userId,
      title: String(raw.title ?? `Trip to ${destination}`),
      origin,
      destination,
      startDate,
      endDate,
      duration: days,
      travelers,
      purpose: "CULTURAL" as any,
      budget,
      currency,
    },
  });

  for (let i = 0; i < rawDays.length; i++) {
    const d = rawDays[i];
    const activities = (d.activities ?? []) as Array<Record<string, unknown>>;

    await prisma.tripDay.create({
      data: {
        tripId: newTrip.id,
        dayNumber: (d.day as number) ?? i + 1,
        date: new Date(startDate.getTime() + i * 86400000),
        theme: (d.theme as string) ?? `Day ${i + 1}`,
        summary: (d.summary as string) ?? "",
        activities: {
          create: activities.map((a) => ({
            time: (a.time as string) ?? "",
            title: (a.title as string) ?? "",
            description: (a.description as string) ?? "",
            location: (a.location as string) ?? "",
            cost: Number(a.cost) || 0,
            type: mapActivityType(a.type as string) as any,
            duration: Number(a.duration) || 60,
          })),
        },
      },
    });
  }

  const fullTrip = await prisma.trip.findUnique({
    where: { id: newTrip.id },
    include: {
      days: { include: { activities: true }, orderBy: { dayNumber: "asc" } },
    },
  });

  return fullTrip as NonNullable<typeof fullTrip>;
}


export async function GET() {
  return new NextResponse("Wandr WhatsApp webhook is live.", { status: 200 });
}
