// prisma/seed-trains.ts
//
// Self-contained seed for TrainStation + Train tables.
// No external JSON files needed — all data embedded.
// Safe to re-run (upserts).
//
// Usage: npx tsx prisma/seed-trains.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Station data (50 major stations) ───────────────────────────────────
interface StationSeed {
  code: string;
  name: string;
  state: string;
  zone: string;
  lat: number;
  lng: number;
}

const STATIONS: StationSeed[] = [
  { code: "NDLS", name: "New Delhi", state: "Delhi", zone: "NR", lat: 28.6425, lng: 77.2196 },
  { code: "DLI", name: "Delhi Junction", state: "Delhi", zone: "NR", lat: 28.6438, lng: 77.2214 },
  { code: "NZM", name: "Hazrat Nizamuddin", state: "Delhi", zone: "NR", lat: 28.5893, lng: 77.2505 },
  { code: "DEC", name: "Delhi Cantt", state: "Delhi", zone: "NR", lat: 28.5733, lng: 77.1800 },
  { code: "CSTM", name: "Mumbai CSMT", state: "Maharashtra", zone: "CR", lat: 18.9398, lng: 72.8355 },
  { code: "BCT", name: "Mumbai Central", state: "Maharashtra", zone: "WR", lat: 18.9712, lng: 72.8196 },
  { code: "LTT", name: "Lokmanya Tilak Terminus", state: "Maharashtra", zone: "CR", lat: 19.0727, lng: 72.8792 },
  { code: "DR", name: "Dadar", state: "Maharashtra", zone: "CR", lat: 19.0183, lng: 72.8438 },
  { code: "SBC", name: "KSR Bengaluru City", state: "Karnataka", zone: "SWR", lat: 12.9767, lng: 77.5713 },
  { code: "BNC", name: "Bangalore Cantt", state: "Karnataka", zone: "SWR", lat: 12.9784, lng: 77.5688 },
  { code: "YPR", name: "Yesvantpur Junction", state: "Karnataka", zone: "SWR", lat: 13.0336, lng: 77.5378 },
  { code: "MAS", name: "Chennai Central", state: "Tamil Nadu", zone: "SR", lat: 13.0827, lng: 80.2707 },
  { code: "MS", name: "Chennai Egmore", state: "Tamil Nadu", zone: "SR", lat: 13.0733, lng: 80.2622 },
  { code: "KOAA", name: "Kolkata", state: "West Bengal", zone: "ER", lat: 22.5726, lng: 88.3639 },
  { code: "SDAH", name: "Sealdah", state: "West Bengal", zone: "ER", lat: 22.5738, lng: 88.3630 },
  { code: "HWH", name: "Howrah Junction", state: "West Bengal", zone: "ER", lat: 22.5839, lng: 88.3425 },
  { code: "HYB", name: "Hyderabad Deccan", state: "Telangana", zone: "SCR", lat: 17.3840, lng: 78.4683 },
  { code: "SC", name: "Secunderabad Junction", state: "Telangana", zone: "SCR", lat: 17.4399, lng: 78.4983 },
  { code: "PUNE", name: "Pune Junction", state: "Maharashtra", zone: "CR", lat: 18.5196, lng: 73.8553 },
  { code: "ADI", name: "Ahmedabad Junction", state: "Gujarat", zone: "WR", lat: 23.0225, lng: 72.5714 },
  { code: "JP", name: "Jaipur Junction", state: "Rajasthan", zone: "NWR", lat: 26.9194, lng: 75.7878 },
  { code: "LKO", name: "Lucknow", state: "Uttar Pradesh", zone: "NR", lat: 26.8392, lng: 80.9231 },
  { code: "LJN", name: "Lucknow NE", state: "Uttar Pradesh", zone: "NER", lat: 26.8453, lng: 80.9317 },
  { code: "CNB", name: "Kanpur Central", state: "Uttar Pradesh", zone: "NCR", lat: 26.4534, lng: 80.3514 },
  { code: "NGP", name: "Nagpur", state: "Maharashtra", zone: "CR", lat: 21.1458, lng: 79.0882 },
  { code: "INDB", name: "Indore Junction", state: "Madhya Pradesh", zone: "WR", lat: 22.7185, lng: 75.8565 },
  { code: "BPL", name: "Bhopal Junction", state: "Madhya Pradesh", zone: "WCR", lat: 23.2599, lng: 77.4126 },
  { code: "PNBE", name: "Patna Junction", state: "Bihar", zone: "ECR", lat: 25.6117, lng: 85.1393 },
  { code: "BRC", name: "Vadodara Junction", state: "Gujarat", zone: "WR", lat: 22.3072, lng: 73.1812 },
  { code: "ST", name: "Surat", state: "Gujarat", zone: "WR", lat: 21.2060, lng: 72.8364 },
  { code: "CBE", name: "Coimbatore Junction", state: "Tamil Nadu", zone: "SR", lat: 11.0235, lng: 76.9408 },
  { code: "ERS", name: "Ernakulam Junction", state: "Kerala", zone: "SR", lat: 9.9816, lng: 76.2999 },
  { code: "MAO", name: "Madgaon", state: "Goa", zone: "KR", lat: 15.2993, lng: 74.0855 },
  { code: "BSB", name: "Varanasi Junction", state: "Uttar Pradesh", zone: "NER", lat: 25.3285, lng: 83.0065 },
  { code: "ASR", name: "Amritsar Junction", state: "Punjab", zone: "NR", lat: 31.6256, lng: 74.8743 },
  { code: "CDG", name: "Chandigarh", state: "Chandigarh", zone: "NR", lat: 30.7333, lng: 76.7794 },
  { code: "GHY", name: "Guwahati", state: "Assam", zone: "NFR", lat: 26.1445, lng: 91.7362 },
  { code: "BBS", name: "Bhubaneswar", state: "Odisha", zone: "ECoR", lat: 20.2565, lng: 85.8306 },
  { code: "RNC", name: "Ranchi", state: "Jharkhand", zone: "SER", lat: 23.3441, lng: 85.3096 },
  { code: "R", name: "Raipur", state: "Chhattisgarh", zone: "SECR", lat: 21.2514, lng: 81.6296 },
  { code: "DDN", name: "Dehradun", state: "Uttarakhand", zone: "NR", lat: 30.3249, lng: 78.0339 },
  { code: "AGC", name: "Agra Cantt", state: "Uttar Pradesh", zone: "NCR", lat: 27.1767, lng: 78.0081 },
  { code: "JU", name: "Jodhpur Junction", state: "Rajasthan", zone: "NWR", lat: 26.2987, lng: 73.0168 },
  { code: "UDZ", name: "Udaipur City", state: "Rajasthan", zone: "NWR", lat: 24.5854, lng: 73.7125 },
  { code: "MYS", name: "Mysuru Junction", state: "Karnataka", zone: "SWR", lat: 12.2970, lng: 76.6558 },
  { code: "MAQ", name: "Mangaluru Central", state: "Karnataka", zone: "SR", lat: 12.8662, lng: 74.8420 },
  { code: "MAJN", name: "Mangaluru Junction", state: "Karnataka", zone: "SR", lat: 12.8682, lng: 74.8370 },
  { code: "VSKP", name: "Visakhapatnam", state: "Andhra Pradesh", zone: "ECoR", lat: 17.7216, lng: 83.2975 },
  { code: "BZA", name: "Vijayawada Junction", state: "Andhra Pradesh", zone: "SCR", lat: 16.5193, lng: 80.6305 },
  { code: "TVC", name: "Thiruvananthapuram Central", state: "Kerala", zone: "SR", lat: 8.4875, lng: 76.9525 },
  { code: "MDU", name: "Madurai Junction", state: "Tamil Nadu", zone: "SR", lat: 9.9104, lng: 78.1195 },
  { code: "NK", name: "Nasik Road", state: "Maharashtra", zone: "CR", lat: 19.9733, lng: 73.7903 },
];

// ── Train route data (40 popular routes, real numbers & names) ─────────
interface TrainSeed {
  number: string;
  name: string;
  from: string; // station code
  to: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  distanceKm: number;
  type: string;
  sleeper: boolean;
  thirdAc: boolean;
  secondAc: boolean;
  firstAc: boolean;
  chairCar: boolean;
}

const TRAINS: TrainSeed[] = [
  // ── Delhi ↔ Mumbai ──
  { number: "12951", name: "Mumbai Rajdhani Express", from: "NDLS", to: "BCT", departure: "16:55:00", arrival: "08:35:00", durationMinutes: 940, distanceKm: 1384, type: "Rajdhani", sleeper: false, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },
  { number: "12952", name: "Mumbai Rajdhani Express", from: "BCT", to: "NDLS", departure: "17:00:00", arrival: "08:32:00", durationMinutes: 932, distanceKm: 1384, type: "Rajdhani", sleeper: false, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },
  { number: "12954", name: "August Kranti Express", from: "NZM", to: "BCT", departure: "17:40:00", arrival: "05:40:00", durationMinutes: 720, distanceKm: 1384, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },
  { number: "12953", name: "August Kranti Express", from: "BCT", to: "NZM", departure: "15:45:00", arrival: "06:00:00", durationMinutes: 795, distanceKm: 1384, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },
  { number: "22210", name: "Duronto Express", from: "NZM", to: "CSTM", departure: "23:00:00", arrival: "15:05:00", durationMinutes: 725, distanceKm: 1365, type: "Duronto", sleeper: true, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },
  { number: "22209", name: "Duronto Express", from: "CSTM", to: "NZM", departure: "23:05:00", arrival: "15:30:00", durationMinutes: 745, distanceKm: 1365, type: "Duronto", sleeper: true, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },

  // ── Delhi ↔ Bangalore ──
  { number: "22691", name: "Bengaluru Rajdhani Express", from: "NZM", to: "SBC", departure: "20:50:00", arrival: "05:40:00", durationMinutes: 2050, distanceKm: 2444, type: "Rajdhani", sleeper: false, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },
  { number: "22692", name: "Bengaluru Rajdhani Express", from: "SBC", to: "NZM", departure: "20:40:00", arrival: "05:20:00", durationMinutes: 2060, distanceKm: 2444, type: "Rajdhani", sleeper: false, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },
  { number: "12628", name: "Karnataka Express", from: "SBC", to: "NDLS", departure: "20:15:00", arrival: "06:05:00", durationMinutes: 2090, distanceKm: 2444, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },

  // ── Delhi ↔ Kolkata ──
  { number: "12302", name: "Howrah Rajdhani Express", from: "NDLS", to: "HWH", departure: "17:00:00", arrival: "10:05:00", durationMinutes: 1025, distanceKm: 1450, type: "Rajdhani", sleeper: false, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },
  { number: "12301", name: "Howrah Rajdhani Express", from: "HWH", to: "NDLS", departure: "14:05:00", arrival: "10:05:00", durationMinutes: 1200, distanceKm: 1450, type: "Rajdhani", sleeper: false, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },
  { number: "12304", name: "Poorva Express", from: "NDLS", to: "HWH", departure: "12:55:00", arrival: "07:55:00", durationMinutes: 1080, distanceKm: 1450, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },
  { number: "12314", name: "Sealdah Rajdhani Express", from: "NDLS", to: "SDAH", departure: "16:55:00", arrival: "09:30:00", durationMinutes: 995, distanceKm: 1460, type: "Rajdhani", sleeper: false, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },

  // ── Delhi ↔ Chennai ──
  { number: "12622", name: "Tamil Nadu Express", from: "NDLS", to: "MAS", departure: "22:30:00", arrival: "07:10:00", durationMinutes: 1960, distanceKm: 2175, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },
  { number: "12621", name: "Tamil Nadu Express", from: "MAS", to: "NDLS", departure: "22:00:00", arrival: "06:30:00", durationMinutes: 2010, distanceKm: 2175, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },

  // ── Delhi ↔ Hyderabad ──
  { number: "12723", name: "Telangana Express", from: "NDLS", to: "SC", departure: "17:00:00", arrival: "11:20:00", durationMinutes: 1100, distanceKm: 1670, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },
  { number: "12724", name: "Telangana Express", from: "SC", to: "NDLS", departure: "07:00:00", arrival: "09:30:00", durationMinutes: 1530, distanceKm: 1670, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },

  // ── Delhi ↔ Jaipur ──
  { number: "12015", name: "Shatabdi Express", from: "NDLS", to: "JP", departure: "06:10:00", arrival: "10:45:00", durationMinutes: 275, distanceKm: 308, type: "Shatabdi", sleeper: false, thirdAc: false, secondAc: false, firstAc: false, chairCar: true },
  { number: "12016", name: "Shatabdi Express", from: "JP", to: "NDLS", departure: "15:45:00", arrival: "20:30:00", durationMinutes: 285, distanceKm: 308, type: "Shatabdi", sleeper: false, thirdAc: false, secondAc: false, firstAc: false, chairCar: true },
  { number: "12955", name: "Jaipur Duronto Express", from: "NDLS", to: "JP", departure: "22:10:00", arrival: "04:45:00", durationMinutes: 395, distanceKm: 308, type: "Duronto", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },
  { number: "12956", name: "Jaipur Duronto Express", from: "JP", to: "NDLS", departure: "22:15:00", arrival: "04:40:00", durationMinutes: 385, distanceKm: 308, type: "Duronto", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },

  // ── Delhi → Agra ──
  { number: "12002", name: "Bhopal Shatabdi Express", from: "NDLS", to: "AGC", departure: "06:00:00", arrival: "07:57:00", durationMinutes: 117, distanceKm: 195, type: "Shatabdi", sleeper: false, thirdAc: false, secondAc: false, firstAc: false, chairCar: true },

  // ── Delhi → Varanasi ──
  { number: "12560", name: "Shiv Ganga Express", from: "NDLS", to: "BSB", departure: "18:30:00", arrival: "05:20:00", durationMinutes: 650, distanceKm: 780, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },

  // ── Delhi → Amritsar ──
  { number: "12013", name: "Shatabdi Express", from: "NDLS", to: "ASR", departure: "07:20:00", arrival: "13:45:00", durationMinutes: 385, distanceKm: 448, type: "Shatabdi", sleeper: false, thirdAc: false, secondAc: false, firstAc: false, chairCar: true },

  // ── Delhi → Chandigarh ──
  { number: "12045", name: "Shatabdi Express", from: "NDLS", to: "CDG", departure: "07:40:00", arrival: "11:10:00", durationMinutes: 210, distanceKm: 245, type: "Shatabdi", sleeper: false, thirdAc: false, secondAc: false, firstAc: false, chairCar: true },

  // ── Mumbai ↔ Goa ──
  { number: "12051", name: "Jan Shatabdi Express", from: "CSTM", to: "MAO", departure: "05:15:00", arrival: "13:00:00", durationMinutes: 465, distanceKm: 587, type: "Janshatabdi", sleeper: false, thirdAc: false, secondAc: false, firstAc: false, chairCar: true },
  { number: "12052", name: "Jan Shatabdi Express", from: "MAO", to: "CSTM", departure: "14:30:00", arrival: "22:10:00", durationMinutes: 460, distanceKm: 587, type: "Janshatabdi", sleeper: false, thirdAc: false, secondAc: false, firstAc: false, chairCar: true },
  { number: "10111", name: "Konkan Kanya Express", from: "CSTM", to: "MAO", departure: "21:00:00", arrival: "08:30:00", durationMinutes: 690, distanceKm: 587, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },
  { number: "12619", name: "Matsyagandha Express", from: "LTT", to: "MAO", departure: "15:50:00", arrival: "04:00:00", durationMinutes: 730, distanceKm: 768, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },

  // ── Mumbai → Bangalore ──
  { number: "16529", name: "Udyan Express", from: "CSTM", to: "SBC", departure: "20:30:00", arrival: "07:00:00", durationMinutes: 1350, distanceKm: 1208, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },

  // ── Mumbai → Jaipur ──
  { number: "12939", name: "Mumbai Jaipur Superfast Express", from: "BCT", to: "JP", departure: "19:05:00", arrival: "08:00:00", durationMinutes: 775, distanceKm: 1163, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },

  // ── Mumbai ↔ Kolkata ──
  { number: "12859", name: "Gitanjali Express", from: "CSTM", to: "HWH", departure: "06:00:00", arrival: "09:40:00", durationMinutes: 2200, distanceKm: 1948, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },
  { number: "12860", name: "Gitanjali Express", from: "HWH", to: "CSTM", departure: "14:05:00", arrival: "17:55:00", durationMinutes: 2230, distanceKm: 1948, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },
  { number: "12322", name: "Kolkata Mail", from: "CSTM", to: "HWH", departure: "21:25:00", arrival: "06:15:00", durationMinutes: 1970, distanceKm: 1968, type: "Mail", sleeper: true, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },

  // ── Mumbai → Ahmedabad ──
  { number: "12247", name: "Duronto Express", from: "BCT", to: "ADI", departure: "23:25:00", arrival: "05:55:00", durationMinutes: 390, distanceKm: 491, type: "Duronto", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },
  { number: "12248", name: "Duronto Express", from: "ADI", to: "BCT", departure: "23:25:00", arrival: "05:55:00", durationMinutes: 390, distanceKm: 491, type: "Duronto", sleeper: true, thirdAc: true, secondAc: true, firstAc: false, chairCar: false },

  // ── Chennai ↔ Bangalore ──
  { number: "12608", name: "Lalbagh Express", from: "SBC", to: "MAS", departure: "06:30:00", arrival: "12:30:00", durationMinutes: 360, distanceKm: 362, type: "SF", sleeper: false, thirdAc: true, secondAc: true, firstAc: false, chairCar: true },
  { number: "12607", name: "Lalbagh Express", from: "MAS", to: "SBC", departure: "15:30:00", arrival: "21:30:00", durationMinutes: 360, distanceKm: 362, type: "SF", sleeper: false, thirdAc: true, secondAc: true, firstAc: false, chairCar: true },

  // ── Chennai → Coimbatore ──
  { number: "12675", name: "Kovai Express", from: "MAS", to: "CBE", departure: "06:10:00", arrival: "12:00:00", durationMinutes: 350, distanceKm: 494, type: "SF", sleeper: false, thirdAc: true, secondAc: true, firstAc: false, chairCar: true },

  // ── Chennai → Madurai ──
  { number: "12635", name: "Vaigai Superfast Express", from: "MAS", to: "MDU", departure: "13:40:00", arrival: "21:15:00", durationMinutes: 455, distanceKm: 497, type: "SF", sleeper: false, thirdAc: true, secondAc: true, firstAc: false, chairCar: true },

  // ── Bangalore → Mysore ──
  { number: "12007", name: "Shatabdi Express", from: "SBC", to: "MYS", departure: "06:15:00", arrival: "09:05:00", durationMinutes: 170, distanceKm: 147, type: "Shatabdi", sleeper: false, thirdAc: false, secondAc: false, firstAc: false, chairCar: true },

  // ── Ernakulam → Trivandrum ──
  { number: "12001", name: "Shatabdi Express", from: "ERS", to: "TVC", departure: "06:10:00", arrival: "09:40:00", durationMinutes: 210, distanceKm: 206, type: "Shatabdi", sleeper: false, thirdAc: false, secondAc: false, firstAc: false, chairCar: true },

  // ── Hyderabad → Bangalore ──
  { number: "12627", name: "Karnataka Express", from: "SBC", to: "NDLS", departure: "20:15:00", arrival: "06:05:00", durationMinutes: 2090, distanceKm: 2444, type: "SF", sleeper: true, thirdAc: true, secondAc: true, firstAc: true, chairCar: false },

  // ── Delhi → Bhopal ──
  { number: "12002", name: "Bhopal Shatabdi Express", from: "NDLS", to: "BPL", departure: "06:00:00", arrival: "14:15:00", durationMinutes: 495, distanceKm: 704, type: "Shatabdi", sleeper: false, thirdAc: false, secondAc: false, firstAc: false, chairCar: true },
];

/* ── Duplicate-number guard (some trains share numbers across routes) ─── */
// Ensure we never try to upsert two trains with the same number
const seen = new Set<string>();
const dedupedTrains = TRAINS.filter((t) => {
  if (seen.has(t.number)) return false;
  seen.add(t.number);
  return true;
});

/* ══════════════════════════════════════════════════════════════════════ */

async function main() {
  console.log(`Seeding ${STATIONS.length} stations...`);

  for (const s of STATIONS) {
    await prisma.trainStation.upsert({
      where: { code: s.code },
      update: { name: s.name, state: s.state, zone: s.zone, lat: s.lat, lng: s.lng },
      create: { code: s.code, name: s.name, state: s.state, zone: s.zone, lat: s.lat, lng: s.lng },
    });
  }
  console.log("Stations done.");

  // Build code → id map
  const allStations = await prisma.trainStation.findMany({ select: { id: true, code: true } });
  const codeToId = new Map(allStations.map((s) => [s.code, s.id]));

  console.log(`Seeding ${dedupedTrains.length} trains...`);
  let seeded = 0;
  for (const t of dedupedTrains) {
    const fromId = codeToId.get(t.from);
    const toId = codeToId.get(t.to);
    if (!fromId || !toId) {
      console.warn(`  Skipping ${t.number}: station ${t.from} or ${t.to} not found`);
      continue;
    }

    await prisma.train.upsert({
      where: { number: t.number },
      update: {
        name: t.name,
        fromStationId: fromId,
        toStationId: toId,
        departure: t.departure,
        arrival: t.arrival,
        durationMinutes: t.durationMinutes,
        distanceKm: t.distanceKm,
        type: t.type,
        hasSleeper: t.sleeper,
        hasThirdAc: t.thirdAc,
        hasSecondAc: t.secondAc,
        hasFirstAc: t.firstAc,
        hasChairCar: t.chairCar,
      },
      create: {
        number: t.number,
        name: t.name,
        fromStationId: fromId,
        toStationId: toId,
        departure: t.departure,
        arrival: t.arrival,
        durationMinutes: t.durationMinutes,
        distanceKm: t.distanceKm,
        type: t.type,
        hasSleeper: t.sleeper,
        hasThirdAc: t.thirdAc,
        hasSecondAc: t.secondAc,
        hasFirstAc: t.firstAc,
        hasChairCar: t.chairCar,
      },
    });
    seeded++;
  }

  console.log(`Trains seeded: ${seeded}`);
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
