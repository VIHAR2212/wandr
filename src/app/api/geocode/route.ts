// src/app/api/geocode/route.ts
// Server-side Nominatim proxy — never blocked, no CORS issues
import { NextRequest, NextResponse } from "next/server";

export const runtime    = "nodejs";
export const maxDuration = 30;

async function geocodeOne(query: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":      "WandrAI/1.0 (wandr-inky.vercel.app)",
        "Accept-Language": "en",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  try {
    const { queries, destination } = await req.json() as {
      queries: string[];
      destination?: string;
    };

    if (!Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results: ([number, number] | null)[] = [];

    for (let i = 0; i < queries.length; i++) {
      if (i > 0) await sleep(1100); // Nominatim 1 req/sec

      let coords = await geocodeOne(queries[i]);

      // Fallback: try with destination appended
      if (!coords && destination && !queries[i].includes(destination)) {
        await sleep(1100);
        coords = await geocodeOne(`${queries[i]}, ${destination}`);
      }

      results.push(coords);
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[geocode API]", err);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
