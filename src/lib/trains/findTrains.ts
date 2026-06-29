// src/lib/trains/findTrains.ts
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

/**
 * Look up real direct trains between two cities using the seeded
 * Indian Railways dataset. Returns an empty array if either city isn't in
 * the major-cities map, or if no direct trains exist between them — callers
 * should treat an empty result as "no real train data available" and let
 * the AI fall back to a generic suggestion rather than a fabricated one.
 *
 * Only direct origin -> destination trains are considered (no connecting
 * trains via intermediate stations) — sufficient for "which train do I take"
 * style guidance.
 */
export async function findTrains(
  originCity: string,
  destinationCity: string,
  limit: number = 5
): Promise<TrainOption[]> {
  const fromCodes = getStationCodesForCity(originCity);
  const toCodes = getStationCodesForCity(destinationCity);

  if (fromCodes.length === 0 || toCodes.length === 0) {
    return [];
  }

  const stations = await prisma.trainStation.findMany({
    where: { code: { in: [...fromCodes, ...toCodes] } },
    select: { id: true, code: true },
  });

  const fromIds = stations.filter((s) => fromCodes.includes(s.code)).map((s) => s.id);
  const toIds = stations.filter((s) => toCodes.includes(s.code)).map((s) => s.id);

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

  return trains.map((t) => {
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
}

/**
 * Formats train options into a short plain-text block to inject into an AI
 * prompt as ground truth, so the model picks a real train instead of
 * inventing a number/name/timing.
 */
export function formatTrainsForPrompt(trains: TrainOption[]): string {
  if (trains.length === 0) return "";

  const lines = trains.map((t) => {
    const cls = t.classes.length > 0 ? t.classes.join("/") : "class info unavailable";
    const hours = Math.floor(t.durationMinutes / 60);
    const mins = t.durationMinutes % 60;
    return `${t.number} ${t.name} | ${t.from} (dep ${t.departure}) -> ${t.to} (arr ${t.arrival}) | ~${hours}h${mins}m | ${cls}`;
  });

  return `Real available trains (use one of these EXACTLY as given, do not invent a different train number/name/timing):\n${lines.join("\n")}`;
}
