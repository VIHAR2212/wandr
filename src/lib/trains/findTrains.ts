import prisma from "@/lib/db";
import { getStationCodesForCity } from "./cityStationMap";

export interface TrainOption {
  number: string;
  name: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  distanceKm: number | null;
  type: string | null;
  classes: string[];
}

/* ── In-memory cache ─────────────────────────────────────────────────── */
const trainCache = new Map<string, { trains: TrainOption[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(origin: string, dest: string): TrainOption[] | null {
  const key = `${origin}|${dest}`;
  const entry = trainCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    trainCache.delete(key);
    return null;
  }
  return entry.trains;
}

function setCache(origin: string, dest: string, trains: TrainOption[]) {
  trainCache.set(`${origin}|${dest}`, { trains, ts: Date.now() });
}

// Auto-cleanup cache every 10 minutes (same pattern as rateLimit)
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of trainCache) {
      if (now - entry.ts > CACHE_TTL_MS) trainCache.delete(key);
    }
  }, 10 * 60 * 1000);
}

/* ────────────────────────────────────────────────────────────────────── */

/**
 * Look up real direct trains between two cities.
 * Returns empty array if either city isn't in the map, or no direct trains
 * exist — callers should treat this as "no real train data" and let AI
 * fall back to a generic suggestion.
 *
 * Wrapped in try/catch so a DB error NEVER crashes trip generation.
 */
export async function findTrains(
  originCity: string,
  destinationCity: string,
  limit: number = 5
): Promise<TrainOption[]> {
  // Sanitize inputs
  const origin = (originCity ?? "").trim().slice(0, 100);
  const dest = (destinationCity ?? "").trim().slice(0, 100);

  if (!origin || !dest) return [];

  // Check cache first
  const cached = getCached(origin, dest);
  if (cached) return cached;

  try {
    const fromCodes = getStationCodesForCity(origin);
    const toCodes = getStationCodesForCity(dest);

    if (fromCodes.length === 0 || toCodes.length === 0) {
      return [];
    }

    const stations = await prisma.trainStation.findMany({
      where: { code: { in: [...fromCodes, ...toCodes] } },
      select: { id: true, code: true },
    });

    const fromIds = stations
      .filter((s) => fromCodes.includes(s.code))
      .map((s) => s.id);
    const toIds = stations
      .filter((s) => toCodes.includes(s.code))
      .map((s) => s.id);

    if (fromIds.length === 0 || toIds.length === 0) return [];

    const trains = await prisma.train.findMany({
      where: {
        fromStationId: { in: fromIds },
        toStationId: { in: toIds },
      },
      include: { fromStation: true, toStation: true },
      orderBy: { durationMinutes: "asc" },
      take: limit,
    });

    const result: TrainOption[] = trains.map((t) => {
      const classes: string[] = [];
      if (t.hasSleeper) classes.push("Sleeper");
      if (t.hasThirdAc) classes.push("3AC");
      if (t.hasSecondAc) classes.push("2AC");
      if (t.hasFirstAc) classes.push("1AC");
      if (t.hasChairCar) classes.push("Chair Car");

      return {
        number: t.number,
        name: t.name,
        from: t.fromStation.name,
        to: t.toStation.name,
        departure: t.departure,
        arrival: t.arrival,
        durationMinutes: t.durationMinutes,
        distanceKm: t.distanceKm,
        type: t.type,
        classes,
      };
    });

    setCache(origin, dest, result);
    return result;
  } catch (error) {
    console.error("[findTrains] Database error, degrading gracefully:", error);
    return [];
  }
}

/**
 * Formats train options into a plain-text block to inject into the AI
 * prompt, so the model picks a real train instead of inventing one.
 */
export function formatTrainsForPrompt(trains: TrainOption[]): string {
  if (trains.length === 0) return "";

  const lines = trains.map((t) => {
    const cls =
      t.classes.length > 0 ? t.classes.join("/") : "class info unavailable";
    const hours = Math.floor(t.durationMinutes / 60);
    const mins = t.durationMinutes % 60;
    return `${t.number} ${t.name} | ${t.from} (dep ${t.departure}) -> ${t.to} (arr ${t.arrival}) | ~${hours}h${mins}m | ${cls}`;
  });

  return `Real available trains (use one of these EXACTLY as given, do not invent a different train number/name/timing):\n${lines.join("\n")}`;
}
