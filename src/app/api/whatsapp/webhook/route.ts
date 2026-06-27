// src/app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";

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

    // --- Command: "plan a trip to X" ---
    const planMatch = lowerBody.match(/plan a trip to (.+)/i);
    if (planMatch) {
      const destination = planMatch[1].trim();
      return twiml(
        `Got it — planning a trip to ${capitalize(
          destination
        )}! 🌍\nHow many days are you thinking?`
      );
      // NOTE: this is where Phase 4's session state will pick up —
      // for now we just acknowledge; no session is persisted yet.
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
    msg += `*Day ${day.dayNumber}*${day.theme ? ` — ${day.theme}` : ""}\n`;
    for (const act of day.activities) {
      msg += `  ${act.time} — ${act.title}\n`;
    }
    msg += "\n";
  }
  return msg.trim();
}

// Twilio also sends a GET sometimes when verifying the endpoint manually.
export async function GET() {
  return new NextResponse("Wandr WhatsApp webhook is live.", { status: 200 });
}
