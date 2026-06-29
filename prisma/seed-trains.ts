// prisma/seed-trains.ts
//
// One-time seed script — populates TrainStation and Train tables from the
// CC0-licensed datameet/railways dataset (stations.json, trains.json in
// prisma/seed-data/). Not run on every deploy; run manually when setting up
// a new database, or re-run safely any time (upserts, won't duplicate).
//
// Usage: npx tsx prisma/seed-trains.ts

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface StationFeature {
  type: "Feature";
  properties: {
    code: string;
    name: string;
    state?: string;
    zone?: string;
  };
  geometry: { type: "Point"; coordinates: [number, number] };
}

interface TrainFeature {
  type: "Feature";
  properties: {
    number: string;
    name: string;
    from_station_code: string;
    to_station_code: string;
    departure: string;
    arrival: string;
    duration_h: number;
    duration_m: number;
    distance?: number;
    type?: string;
    sleeper?: boolean | number;
    third_ac?: boolean | number;
    second_ac?: boolean | number;
    first_ac?: boolean | number;
    chair_car?: boolean | number;
  };
}

function truthy(v: boolean | number | undefined): boolean {
  return v === true || v === 1;
}

async function main() {
  const dataDir = path.join(__dirname, "seed-data");

  console.log("Reading stations.json...");
  const stationsRaw = JSON.parse(
    fs.readFileSync(path.join(dataDir, "stations.json"), "utf-8")
  ) as { features: StationFeature[] };

  console.log("Reading trains.json...");
  const trainsRaw = JSON.parse(
    fs.readFileSync(path.join(dataDir, "trains.json"), "utf-8")
  ) as { features: TrainFeature[] };

  console.log(`Seeding ${stationsRaw.features.length} stations...`);
  let stationCount = 0;
  for (const f of stationsRaw.features) {
    const p = f.properties;
    if (!p.code || !p.name) continue;

    await prisma.trainStation.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        state: p.state ?? null,
        zone: p.zone ?? null,
        lng: f.geometry?.coordinates?.[0] ?? null,
        lat: f.geometry?.coordinates?.[1] ?? null,
      },
      create: {
        code: p.code,
        name: p.name,
        state: p.state ?? null,
        zone: p.zone ?? null,
        lng: f.geometry?.coordinates?.[0] ?? null,
        lat: f.geometry?.coordinates?.[1] ?? null,
      },
    });

    stationCount++;
    if (stationCount % 1000 === 0) console.log(`  ...${stationCount} stations done`);
  }
  console.log(`Stations seeded: ${stationCount}`);

  // Build a code -> id lookup so we don't hit the DB once per train
  const allStations = await prisma.trainStation.findMany({
    select: { id: true, code: true },
  });
  const codeToId = new Map(allStations.map((s) => [s.code, s.id]));

  console.log(`Seeding ${trainsRaw.features.length} trains...`);
  let trainCount = 0;
  let skipped = 0;

  for (const f of trainsRaw.features) {
    const p = f.properties;
    const fromId = codeToId.get(p.from_station_code);
    const toId = codeToId.get(p.to_station_code);

    if (!p.number || !p.name || !fromId || !toId) {
      skipped++;
      continue;
    }

    const durationMinutes = (p.duration_h ?? 0) * 60 + (p.duration_m ?? 0);

    await prisma.train.upsert({
      where: { number: p.number },
      update: {
        name: p.name,
        fromStationId: fromId,
        toStationId: toId,
        departure: p.departure ?? "",
        arrival: p.arrival ?? "",
        durationMinutes,
        distanceKm: p.distance ?? null,
        type: p.type ?? null,
        hasSleeper: truthy(p.sleeper),
        hasThirdAc: truthy(p.third_ac),
        hasSecondAc: truthy(p.second_ac),
        hasFirstAc: truthy(p.first_ac),
        hasChairCar: truthy(p.chair_car),
      },
      create: {
        number: p.number,
        name: p.name,
        fromStationId: fromId,
        toStationId: toId,
        departure: p.departure ?? "",
        arrival: p.arrival ?? "",
        durationMinutes,
        distanceKm: p.distance ?? null,
        type: p.type ?? null,
        hasSleeper: truthy(p.sleeper),
        hasThirdAc: truthy(p.third_ac),
        hasSecondAc: truthy(p.second_ac),
        hasFirstAc: truthy(p.first_ac),
        hasChairCar: truthy(p.chair_car),
      },
    });

    trainCount++;
    if (trainCount % 500 === 0) console.log(`  ...${trainCount} trains done`);
  }

  console.log(`Trains seeded: ${trainCount}`);
  console.log(`Trains skipped (bad/missing data): ${skipped}`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
