'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Navigation, CheckCircle, Phone, Clock, AlertTriangle,
  MapPin, Plane, Train, Bus, Car, Footprints, Shield
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */
interface TrackingTripData {
  tripId: string;
  formData: any;
  generatedTrip: any;
  createdAt: string;
  originLat?: number | null;
  originLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
}

interface DemoStop {
  name: string;
  location: string;
  lat: number;
  lng: number;
  type: 'origin' | 'station' | 'sightseeing' | 'restaurant' | 'hiddenGem' | 'hotel' | 'home';
  transportMode: string;
  dayNumber: number;
  time: string;
  description: string;
}

/* ═══════════════════════════════════════════════════════════
   HAVERSINE
   ═══════════════════════════════════════════════════════════ */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/* ═══════════════════════════════════════════════════════════
   STATION COORDINATES DATABASE
   Key Indian railway stations with real lat/lng
   ═══════════════════════════════════════════════════════════ */
const SC: Record<string, { lat: number; lng: number; name: string }> = {
  BCT:  { lat: 18.9712, lng: 72.8196, name: 'Mumbai Central' },
  CSTM: { lat: 18.9398, lng: 72.8355, name: 'Chhatrapati Shivaji Terminus' },
  LTT:  { lat: 19.0728, lng: 72.8791, name: 'Lokmanya Tilak Terminus' },
  DR:   { lat: 18.9980, lng: 72.8380, name: 'Dadar Junction' },
  BVI:  { lat: 19.2293, lng: 72.8565, name: 'Borivali' },
  VAPI: { lat: 20.3734, lng: 72.8364, name: 'Vapi' },
  NDLS: { lat: 28.6425, lng: 77.2196, name: 'New Delhi' },
  DLI:  { lat: 28.6556, lng: 77.2314, name: 'Old Delhi Junction' },
  NZM:  { lat: 28.5825, lng: 77.2481, name: 'Nizamuddin' },
  ADI:  { lat: 23.0261, lng: 72.5780, name: 'Ahmedabad Junction' },
  BRC:  { lat: 22.3099, lng: 72.1815, name: 'Vadodara Junction' },
  ST:   { lat: 21.2060, lng: 72.8364, name: 'Surat' },
  RJT:  { lat: 22.3016, lng: 70.8022, name: 'Rajkot Junction' },
  DWK:  { lat: 22.2370, lng: 68.9681, name: 'Dwarka' },
  PBR:  { lat: 21.6458, lng: 69.6078, name: 'Porbandar' },
  JP:   { lat: 26.9124, lng: 75.7873, name: 'Jaipur Junction' },
  JU:   { lat: 26.2851, lng: 73.0151, name: 'Jodhpur Junction' },
  UDZ:  { lat: 24.5854, lng: 73.7125, name: 'Udaipur City' },
  AGC:  { lat: 27.1767, lng: 78.0081, name: 'Agra Cantt' },
  NGP:  { lat: 21.1458, lng: 79.0882, name: 'Nagpur Junction' },
  PUNE: { lat: 18.5196, lng: 73.8553, name: 'Pune Junction' },
  BPL:  { lat: 23.2599, lng: 77.4126, name: 'Bhopal Junction' },
  INDB: { lat: 22.7182, lng: 75.8577, name: 'Indore Junction' },
  KOTA: { lat: 25.1800, lng: 75.8648, name: 'Kota Junction' },
  LKO:  { lat: 26.8467, lng: 80.9462, name: 'Lucknow' },
  CNB:  { lat: 26.4535, lng: 80.3514, name: 'Kanpur Central' },
  BSB:  { lat: 25.3176, lng: 83.0068, name: 'Varanasi Junction' },
  PNBE: { lat: 25.6114, lng: 85.1370, name: 'Patna Junction' },
  MAS:  { lat: 13.0827, lng: 80.2707, name: 'Chennai Central' },
  SBC:  { lat: 12.9716, lng: 77.5946, name: 'Bangalore City' },
  HYB:  { lat: 17.3840, lng: 78.4682, name: 'Hyderabad' },
  SC:   { lat: 17.4435, lng: 78.4682, name: 'Secunderabad' },
  TVC:  { lat: 8.4875, lng: 76.9525, name: 'Trivandrum Central' },
  ERS:  { lat: 9.9816, lng: 76.2999, name: 'Ernakulam Junction' },
  CBE:  { lat: 11.4016, lng: 76.9690, name: 'Coimbatore' },
  HWH:  { lat: 22.5839, lng: 88.3425, name: 'Howrah Junction' },
  KOAA: { lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
  BBS:  { lat: 20.2398, lng: 85.8447, name: 'Bhubaneswar' },
  VSKP: { lat: 17.7059, lng: 83.2977, name: 'Visakhapatnam' },
  BZA:  { lat: 16.5193, lng: 80.6305, name: 'Vijayawada Junction' },
  ASR:  { lat: 31.6340, lng: 74.8723, name: 'Amritsar Junction' },
  CDG:  { lat: 30.7333, lng: 76.7794, name: 'Chandigarh' },
  DDN:  { lat: 30.8969, lng: 77.8969, name: 'Dehradun' },
  RNC:  { lat: 23.3441, lng: 85.3096, name: 'Ranchi' },
  GHY:  { lat: 26.1225, lng: 91.7362, name: 'Guwahati' },
  R:    { lat: 21.2514, lng: 81.6296, name: 'Raipur Junction' },
  MDU:  { lat: 9.9252, lng: 78.1198, name: 'Madurai Junction' },
  MAO:  { lat: 15.2993, lng: 74.0855, name: 'Madgaon' },
  NK:   { lat: 19.9975, lng: 73.7898, name: 'Nashik Road' },
  KYN:  { lat: 19.0746, lng: 73.0286, name: 'Kalyan Junction' },
  ALD:  { lat: 25.4358, lng: 81.8463, name: 'Prayagraj Junction' },
  JHS:  { lat: 25.4476, lng: 78.5705, name: 'Jhansi Junction' },
  GKP:  { lat: 26.7560, lng: 83.3730, name: 'Gorakhpur Junction' },
  MYS:  { lat: 12.2979, lng: 76.6538, name: 'Mysore Junction' },
  MAQ:  { lat: 12.8662, lng: 74.8420, name: 'Mangalore' },
};

/* ═══════════════════════════════════════════════════════════
   RAILWAY CORRIDORS — ordered station codes (A → B)
   Used to trace the actual train route between cities
   ═══════════════════════════════════════════════════════════ */
const CORRIDORS: Record<string, string[]> = {
  // Mumbai ↔ Gujarat (Western Railway)
  'MUMBAI-AHMEDABAD':  ['BCT', 'BVI', 'VAPI', 'ST', 'BRC', 'ADI'],
  'MUMBAI-VADODARA':   ['BCT', 'BVI', 'VAPI', 'ST', 'BRC'],
  'MUMBAI-SURAT':      ['BCT', 'BVI', 'VAPI', 'ST'],
  'MUMBAI-RAJKOT':     ['BCT', 'BVI', 'VAPI', 'ST', 'BRC', 'ADI', 'RJT'],
  'MUMBAI-DWARKA':     ['BCT', 'BVI', 'VAPI', 'ST', 'BRC', 'ADI', 'RJT', 'DWK'],
  'MUMBAI-PORBANDAR':  ['BCT', 'BVI', 'VAPI', 'ST', 'BRC', 'ADI', 'RJT', 'PBR'],
  'AHMEDABAD-DWARKA':      ['ADI', 'RJT', 'DWK'],
  'AHMEDABAD-RAJKOT':      ['ADI', 'RJT'],
  'AHMEDABAD-VADODARA':    ['ADI', 'BRC'],
  'AHMEDABAD-SURAT':       ['ADI', 'BRC', 'ST'],
  'VADODARA-SURAT':        ['BRC', 'ST'],
  // Mumbai ↔ Delhi (Western + Central)
  'MUMBAI-DELHI':      ['BCT', 'BVI', 'BRC', 'KOTA', 'JHS', 'AGC', 'NDLS'],
  'DELHI-MUMBAI':      ['NDLS', 'AGC', 'JHS', 'KOTA', 'BRC', 'BVI', 'BCT'],
  // Mumbai ↔ others
  'MUMBAI-PUNE':       ['CSTM', 'KYN', 'PUNE'],
  'MUMBAI-GOA':        ['CSTM', 'KYN', 'MAO'],
  'MUMBAI-NAGPUR':     ['CSTM', 'KYN', 'NGP'],
  // Delhi ↔ Rajasthan
  'DELHI-JAIPUR':      ['NDLS', 'JP'],
  'DELHI-JODHPUR':     ['NDLS', 'JP', 'JU'],
  'DELHI-UDAIPUR':     ['NDLS', 'JP', 'UDZ'],
  'DELHI-AGRA':        ['NDLS', 'AGC'],
  'JAIPUR-JODHPUR':    ['JP', 'JU'],
  'JAIPUR-UDAIPUR':    ['JP', 'UDZ'],
  // Delhi ↔ UP / East
  'DELHI-LUCKNOW':     ['NDLS', 'CNB', 'LKO'],
  'DELHI-KANPUR':      ['NDLS', 'CNB'],
  'DELHI-VARANASI':    ['NDLS', 'CNB', 'LKO', 'BSB'],
  'DELHI-KOLKATA':     ['NDLS', 'CNB', 'ALD', 'BSB', 'KOAA'],
  'DELHI-PATNA':       ['NDLS', 'CNB', 'ALD', 'PNBE'],
  'DELHI-BHUBANESWAR': ['NDLS', 'JHS', 'BPL', 'NGP', 'R', 'BBS'],
  'DELHI-RANCHI':      ['NDLS', 'CNB', 'ALD', 'RNC'],
  // Delhi ↔ South
  'DELHI-CHENNAI':     ['NDLS', 'AGC', 'JHS', 'BPL', 'NGP', 'BZA', 'MAS'],
  'DELHI-HYDERABAD':   ['NDLS', 'JHS', 'BPL', 'NGP', 'SC'],
  'DELHI-BANGALORE':   ['NDLS', 'AGC', 'JHS', 'BPL', 'NGP', 'BZA', 'MAS', 'SBC'],
  // South corridors
  'CHENNAI-BANGALORE': ['MAS', 'SBC'],
  'CHENNAI-TRIVANDRUM': ['MAS', 'ERS', 'TVC'],
  'BANGALORE-MYSORE':  ['SBC', 'MYS'],
  'HYDERABAD-CHENNAI': ['SC', 'BZA', 'MAS'],
  'HYDERABAD-BANGALORE': ['SC', 'BZA', 'MAS', 'SBC'],
  'RANCHI-KOLKATA':    ['RNC', 'KOAA'],
};

/* ─── City → station helpers ──────────────────────────── */
function norm(city: string) {
  return city.trim().toUpperCase().replace(/[^A-Z]/g, '');
}

const CITY_ST: Record<string, string> = {
  MUMBAI:'BCT', DELHI:'NDLS', NEWDELHI:'NDLS',
  BANGALORE:'SBC', BENGALURU:'SBC', CHENNAI:'MAS',
  KOLKATA:'KOAA', HYDERABAD:'SC', SECUNDERABAD:'SC',
  PUNE:'PUNE', AHMEDABAD:'ADI', JAIPUR:'JP',
  LUCKNOW:'LKO', KANPUR:'CNB', NAGPUR:'NGP',
  INDORE:'INDB', BHOPAL:'BPL', PATNA:'PNBE',
  VADODARA:'BRC', BARODA:'BRC', SURAT:'ST',
  COIMBATORE:'CBE', KOCHI:'ERS', COCHIN:'ERS', ERNAKULAM:'ERS',
  GOA:'MAO', MADGAON:'MAO', PANAJI:'MAO',
  VARANASI:'BSB', BANARAS:'BSB', AMRITSAR:'ASR',
  CHANDIGARH:'CDG', GUWAHATI:'GHY', BHUBANESWAR:'BBS',
  RANCHI:'RNC', RAIPUR:'R', DEHRADUN:'DDN',
  AGRA:'AGC', JODHPUR:'JU', UDAIPUR:'UDZ',
  MYSORE:'MYS', MYSURU:'MYS', MANGALORE:'MAQ', MANGALURU:'MAQ',
  VISAKHAPATNAM:'VSKP', VIZAG:'VSKP', VIJAYAWADA:'BZA',
  TRIVANDRUM:'TVC', THIRUVANANTHAPURAM:'TVC', MADURAI:'MDU',
  NASIK:'NK', NASHIK:'NK', RAJKOT:'RJT', DWARKA:'DWK', PORBANDAR:'PBR',
};

function cityToStation(city: string): string | null {
  const n = norm(city);
  if (CITY_ST[n]) return CITY_ST[n];
  for (const [k, v] of Object.entries(CITY_ST)) {
    if (n.includes(k) || k.includes(n)) return v;
  }
  return null;
}

function stationCoords(code: string) { return SC[code] || null; }

/** Find corridor stations from → to. Returns ordered codes. */
function findCorridor(from: string, to: string): string[] {
  const a = norm(from), b = norm(to);
  const k1 = `${a}-${b}`, k2 = `${b}-${a}`;
  if (CORRIDORS[k1]) return CORRIDORS[k1];
  if (CORRIDORS[k2]) return [...CORRIDORS[k2]].reverse();
  // Partial match (handles "Dwarka Beach" matching DWARKA)
  for (const [key, stations] of Object.entries(CORRIDORS)) {
    const [c1, c2] = key.split('-');
    const aMatch = a.includes(c1) || c1.includes(a);
    const bMatch = b.includes(c2) || c2.includes(b);
    if (aMatch && bMatch) return stations;
    const aMatch2 = a.includes(c2) || c2.includes(a);
    const bMatch2 = b.includes(c1) || c1.includes(b);
    if (aMatch2 && bMatch2) return [...stations].reverse();
  }
  return [];
}

/* ─── Transport mode detection ───────────────────────── */
function getTransportMode(title: string, formData: any): string {
  const prefs: string[] = formData?.transportPreferences || [];
  const t = (title || '').toLowerCase();
  if (t.includes('flight') || t.includes('fly') || t.includes('airport')) return 'Flight';
  if (t.includes('train') || t.includes('rail')) return 'Train';
  if (t.includes('bus') || t.includes('coach')) return 'Bus';
  if (t.includes('car') || t.includes('cab') || t.includes('drive')) return 'Car';
  if (prefs.some((p: string) => ['TRAIN','RAIL'].includes((p||'').toUpperCase()))) return 'Train';
  if (prefs.some((p: string) => ['FLIGHT','FLIGHTS'].includes((p||'').toUpperCase()))) return 'Flight';
  return 'Car';
}

/** Extract from/to cities from transport activity title */
function parseTransportCities(title: string, fallbackFrom: string): { from: string; to: string } | null {
  const t = title.toLowerCase();
  const toMatch = t.match(/(?:to|for)\s+([a-z]+(?:\s[a-z]+)?)/);
  const fromMatch = t.match(/from\s+([a-z]+(?:\s[a-z]+)?)/);
  if (!toMatch) return null;
  return { from: fromMatch?.[1] || fallbackFrom, to: toMatch[1] };
}

/* ═══════════════════════════════════════════════════════════
   BUILD DEMO STOPS (station-aware)
   - Origin city added as first stop
   - Transport activities replaced with corridor stations
   - Sightseeing/restaurant/etc kept as-is
   - Return home with corridor stations
   ═══════════════════════════════════════════════════════════ */
function buildDemoStops(trip: any, formData: any): Omit<DemoStop, 'lat' | 'lng'>[] {
  const result: Omit<DemoStop, 'lat' | 'lng'>[] = [];
  const days = trip?.days || [];
  const originCity = formData?.originCity || formData?.origin || formData?.departureCity || '';
  let lastCity = originCity;

  // 1. Origin stop (uses station coords if available)
  if (originCity) {
    const stCode = cityToStation(originCity);
    const stInfo = stCode ? stationCoords(stCode) : null;
    result.push({
      name: stInfo?.name || originCity,
      location: originCity,
      type: 'origin',
      transportMode: '',
      dayNumber: 0,
      time: 'Start',
      description: `Journey starts from ${originCity}`,
    });
  }

  // 2. Process each day's activities
  days.forEach((day: any, dayIdx: number) => {
    const dayNum = day.day || dayIdx + 1;
    for (const act of (day.activities || [])) {
      if (act.type === 'transport') {
        const mode = getTransportMode(act.title, formData);
        const cities = parseTransportCities(act.title, lastCity);
        if (!cities) continue;
        const { from, to } = cities;

        if (mode === 'Train') {
          const corridor = findCorridor(from, to);
          if (corridor.length > 1) {
            // Skip first station if user is already there
            let startIdx = 0;
            if (result.length > 0) {
              const lastLoc = result[result.length - 1].location;
              const lastCode = cityToStation(lastLoc);
              if (lastCode && lastCode === corridor[0]) startIdx = 1;
            }
            for (let i = startIdx; i < corridor.length; i++) {
              const info = stationCoords(corridor[i]);
              if (!info) continue;
              result.push({
                name: info.name,
                location: info.name,
                type: 'station',
                transportMode: mode,
                dayNumber: dayNum,
                time: act.time || '',
                description: i === corridor.length - 1
                  ? `Arriving at ${to}`
                  : `Passing through ${info.name}`,
              });
            }
            lastCity = to;
            continue;
          }
        }

        // Flight or unknown corridor — add destination station/city directly
        const destCode = cityToStation(to);
        const destInfo = destCode ? stationCoords(destCode) : null;
        result.push({
          name: destInfo?.name || to,
          location: to,
          type: 'station',
          transportMode: mode,
          dayNumber: dayNum,
          time: act.time || '',
          description: `Arriving at ${to} via ${mode}`,
        });
        lastCity = to;
      } else {
        // Regular stop (sightseeing, restaurant, etc.)
        const validTypes = ['sightseeing','restaurant','hiddenGem','hotel'];
        result.push({
          name: act.title || 'Stop',
          location: act.location || act.title || '',
          type: (validTypes.includes(act.type) ? act.type : 'sightseeing') as DemoStop['type'],
          transportMode: '',
          dayNumber: dayNum,
          time: act.time || '',
          description: act.description || '',
        });
        if (act.location) {
          const c = act.location.split(',')[0].trim();
          if (c.length > 0 && c.length < 30) lastCity = c;
        }
      }
    }
  });

  // 3. Return-home corridor
  if (originCity && result.length > 0) {
    const mode = getTransportMode('', formData);
    const corridor = findCorridor(lastCity, originCity);

    if (corridor.length > 1) {
      let startIdx = 0;
      const lastLoc = result[result.length - 1].location;
      const lastCode = cityToStation(lastLoc);
      if (lastCode && lastCode === corridor[0]) startIdx = 1;
      // Add intermediate stations (exclude first if already there, exclude last = home station)
      const returnDay = (days[days.length - 1]?.day || days.length) + 0.3;
      for (let i = startIdx; i < corridor.length - 1; i++) {
        const info = stationCoords(corridor[i]);
        if (!info) continue;
        result.push({
          name: info.name,
          location: info.name,
          type: 'station',
          transportMode: mode,
          dayNumber: returnDay,
          time: '',
          description: `Return via ${info.name}`,
        });
      }
    }

    result.push({
      name: 'Home \u2014 Safe Return',
      location: originCity,
      type: 'home',
      transportMode: mode,
      dayNumber: (days[days.length - 1]?.day || days.length) + 0.5,
      time: '',
      description: `Return safely to ${originCity}`,
    });
  }

  return result;
}

/* ═══════════════════════════════════════════════════════════
   GEOCODING — resolve coordinates for all stops
   Stations use DB coords, others use /api/geocode
   ═══════════════════════════════════════════════════════════ */
async function resolveCoords(
  rawStops: Omit<DemoStop, 'lat' | 'lng'>[],
  originLat?: number | null,
  originLng?: number | null,
): Promise<DemoStop[]> {
  const coords = new Array<{ lat: number; lng: number } | null>(rawStops.length).fill(null);
  const needGeo: { idx: number; query: string }[] = [];

  rawStops.forEach((s, idx) => {
    // Try station database first
    if (s.type === 'station' || s.type === 'origin' || s.type === 'home') {
      const code = cityToStation(s.location);
      if (code) {
        const info = stationCoords(code);
        if (info) { coords[idx] = { lat: info.lat, lng: info.lng }; return; }
      }
      // Also try matching by name in SC
      for (const info of Object.values(SC)) {
        if (s.name === info.name || s.location.includes(info.name)) {
          coords[idx] = { lat: info.lat, lng: info.lng }; return;
        }
      }
      // Fallback: use origin coords for origin/home
      if ((s.type === 'origin' || s.type === 'home') && originLat && originLng) {
        coords[idx] = { lat: originLat, lng: originLng }; return;
      }
    }
    needGeo.push({ idx, query: s.location });
  });

  // Batch geocode remaining stops via server endpoint
  if (needGeo.length > 0) {
    try {
      const allQueries = needGeo.map(n => n.query);
      const dest = rawStops[rawStops.length - 1]?.location || '';
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: allQueries, destination: dest }),
      });
      const data = await res.json();
      const results: ([number, number] | null)[] = data?.results || [];
      needGeo.forEach((n, i) => {
        if (results[i]) {
          coords[n.idx] = { lat: results[i]![1], lng: results[i]![0] };
        }
      });
    } catch (e) {
      console.warn('[TrackingOverlay] geocode batch failed', e);
    }
  }

  // Build final array, filter out failed geocodes (0,0)
  return rawStops
    .map((s, i) => ({ ...s, lat: coords[i]?.lat ?? 0, lng: coords[i]?.lng ?? 0 }))
    .filter(s => !(s.lat === 0 && s.lng === 0));
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */
const INTER_CITY_KM = 50;
const REMINDER_INTERVAL = 15000;
const MAX_REMINDERS = 5;
const PAN_THROTTLE = 400;

/* ═══════════════════════════════════════════════════════════
   MARKER ELEMENT FACTORIES
   ═══════════════════════════════════════════════════════════ */
function makeUserEl(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = `<div style="position:relative;width:46px;height:46px;">
    <div style="position:absolute;inset:-4px;border-radius:50%;background:radial-gradient(circle,rgba(249,115,22,0.4) 0%,transparent 70%);animation:up2 2s ease-out infinite;"></div>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#F97316,#EA580C);border:3px solid white;box-shadow:0 0 14px rgba(249,115,22,0.7),0 2px 8px rgba(0,0,0,0.3);z-index:2;"></div>
    <style>@keyframes up2{0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(2.4);opacity:0}}</style>
  </div>`;
  return el;
}

function makeTransportEl(mode: string): HTMLElement {
  const emojis: Record<string, string> = {
    Flight: '\u2708\uFE0F', Train: '\uD83D\uDE86', Bus: '\uD83D\uDE8C', Car: '\uD83D\uDE97', Walking: '\uD83D\uDEB6',
  };
  const emoji = emojis[mode] || '\uD83D\uDE97';
  const el = document.createElement('div');
  el.innerHTML = `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#F97316,#EA580C);display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 0 16px rgba(249,115,22,0.6),0 0 32px rgba(234,88,12,0.3);animation:tb 1.5s ease-in-out infinite;">
    <style>@keyframes tb{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}</style>
    ${emoji}
  </div>`;
  return el;
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */
export function TrackingOverlay({ tripData, onClose }: { tripData: TrackingTripData; onClose: () => void }) {
  const trip = tripData?.generatedTrip;
  const formData = tripData?.formData;
  const originLat = tripData?.originLat;
  const originLng = tripData?.originLng;

  const [phase, setPhase] = useState<'geocoding' | 'transit' | 'waiting_confirmation' | 'completed'>('geocoding');
  const [stops, setStops] = useState<DemoStop[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentTransportMode, setCurrentTransportMode] = useState('');
  const [reminderCount, setReminderCount] = useState(0);
  const [showHelpline, setShowHelpline] = useState(false);
  const [geoProgress, setGeoProgress] = useState({ done: 0, total: 0 });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);
  const trailCoords = useRef<[number, number][]>([]);
  const reminderRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopsRef = useRef<DemoStop[]>([]);

  useEffect(() => { stopsRef.current = stops; }, [stops]);

  /* ─── Build & geocode stops ────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    const raw = buildDemoStops(trip, formData);
    setGeoProgress({ done: 0, total: raw.length });

    resolveCoords(raw, originLat, originLng).then(geocoded => {
      if (cancelled) return;
      setGeoProgress({ done: geocoded.length, total: geocoded.length });
      setStops(geocoded);
    });

    return () => { cancelled = true; };
  }, [trip, formData, originLat, originLng]);

  /* ─── Init Map (runs once when stops are ready) ────── */
  useEffect(() => {
    if (stops.length === 0 || mapRef.current) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const isDark = document.documentElement.classList.contains('dark');
      const styleUrl = isDark
        ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
        : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: [stops[0].lng, stops[0].lat],
        zoom: 5,
        attributionControl: false,
      });

      try { (map as any).setProjection({ type: 'globe' }); } catch {}
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
      map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: true }), 'bottom-right');

      map.on('load', () => {
        const allCoords: [number, number][] = [];

        // Add markers for all stops
        stops.forEach((stop) => {
          const coord: [number, number] = [stop.lng, stop.lat];
          allCoords.push(coord);

          let dotColor = '#F97316';
          if (stop.type === 'restaurant') dotColor = '#22C55E';
          if (stop.type === 'station') dotColor = '#3B82F6';
          if (stop.type === 'hiddenGem') dotColor = '#A855F7';
          if (stop.type === 'home') dotColor = '#EF4444';
          if (stop.type === 'origin') dotColor = '#FBBF24';

          const sz = stop.type === 'station' ? 6 : 8;
          const dotEl = document.createElement('div');
          dotEl.innerHTML = `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${dotColor};border:2px solid white;box-shadow:0 0 6px ${dotColor}80;transition:all .3s;"></div>`;

          const marker = new maplibregl.Marker({ element: dotEl })
            .setLngLat(coord)
            .setPopup(new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(
              `<div style="padding:4px 8px;"><b>${stop.name}</b><br><small style="opacity:0.7;">${stop.location}</small></div>`
            ))
            .addTo(map);

          stopMarkersRef.current.push(marker);
        });

        // Full route line (dashed, shows complete path)
        if (allCoords.length > 1) {
          const routeGeo: any = {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: allCoords },
            properties: {},
          };

          map.addSource('tracking-route-glow', { type: 'geojson', data: routeGeo });
          map.addLayer({
            id: 'tracking-route-glow', type: 'line', source: 'tracking-route-glow',
            paint: { 'line-color': '#F97316', 'line-width': 6, 'line-opacity': 0.15 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          });

          map.addSource('tracking-route-main', { type: 'geojson', data: routeGeo });
          map.addLayer({
            id: 'tracking-route-main', type: 'line', source: 'tracking-route-main',
            paint: { 'line-color': '#EA580C', 'line-width': 2.5, 'line-opacity': 0.4, 'line-dasharray': [6, 10] },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          });

          // Add symbol layer for stop labels
          const labelGeo: any = {
            type: 'FeatureCollection',
            features: stops.map((s, i) => ({
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
              properties: { name: s.name, idx: i },
            })),
          };
          map.addSource('stop-labels', { type: 'geojson', data: labelGeo });
          map.addLayer({
            id: 'stop-labels-layer',
            type: 'symbol',
            source: 'stop-labels',
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Open Sans Regular'],
              'text-size': 11,
              'text-anchor': 'top',
              'text-offset': [0, 0.8],
              'text-max-width': 8,
              'text-allow-overlap': false,
            },
            paint: {
              'text-color': '#F1F5F9',
              'text-halo-color': '#000000',
              'text-halo-width': 2,
            },
          });

          const bounds = new maplibregl.LngLatBounds();
          allCoords.forEach(c => bounds.extend(c));
          map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
        }

        // User marker at first stop
        const firstCoord: [number, number] = allCoords[0] || [72.877, 19.076];
        userMarkerRef.current = new maplibregl.Marker({ element: makeUserEl() })
          .setLngLat(firstCoord)
          .addTo(map);

        // Trail line (solid, animated)
        trailCoords.current = [firstCoord];
        map.addSource('tracking-trail', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: trailCoords.current }, properties: {} },
        });
        map.addLayer({
          id: 'tracking-trail-line', type: 'line', source: 'tracking-trail',
          paint: { 'line-color': '#F97316', 'line-width': 4, 'line-opacity': 0.85 },
          layout: { 'line-cap': 'round', 'line-join': 'round' },
        });

        setPhase('transit');
        beginDemo(0);
      });

      mapRef.current = map;
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  /* ─── Demo animation engine ─────────────────────────── */
  const beginDemo = useCallback((fromIdx: number) => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    const allStops = stopsRef.current;
    if (!allStops || fromIdx >= allStops.length - 1) { setPhase('completed'); return; }

    const from = allStops[fromIdx];
    const to = allStops[fromIdx + 1];

    // Distance-based animation speed
    const dist = haversineKm(from, to);
    const isLong = dist > INTER_CITY_KM;
    const stepsPerSeg = isLong ? 55 : 28;
    const intervalMs = isLong ? 170 : 110;

    // Transport mode for this segment
    const segMode = to.transportMode || '';
    setCurrentTransportMode(segMode);

    const map = mapRef.current;
    if (map && userMarkerRef.current) {
      const newEl = segMode ? makeTransportEl(segMode) : makeUserEl();
      userMarkerRef.current.remove();
      userMarkerRef.current = new maplibregl.Marker({ element: newEl })
        .setLngLat([from.lng, from.lat])
        .addTo(map);
    }

    let step = 0;
    demoIntervalRef.current = setInterval(() => {
      const s = stopsRef.current;
      if (!s || fromIdx >= s.length - 1) {
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
        return;
      }

      const progress = step / stepsPerSeg;
      const lat = from.lat + (to.lat - from.lat) * progress;
      const lng = from.lng + (to.lng - from.lng) * progress;
      const coord: [number, number] = [lng, lat];

      if (map && userMarkerRef.current) {
        userMarkerRef.current.setLngLat(coord);

        trailCoords.current.push(coord);
        const src = map.getSource('tracking-trail') as maplibregl.GeoJSONSource;
        src?.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [...trailCoords.current] },
          properties: {},
        });

        if (!panTimerRef.current) {
          panTimerRef.current = setTimeout(() => {
            map.panTo(coord, { animate: true, duration: 500 });
            panTimerRef.current = null;
          }, PAN_THROTTLE);
        }
      }

      step++;
      if (step >= stepsPerSeg) {
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
        setCurrentIdx(fromIdx + 1);
        setPhase('waiting_confirmation');
        let rc = 0;
        if (reminderRef.current) clearInterval(reminderRef.current);
        reminderRef.current = setInterval(() => {
          rc++;
          setReminderCount(rc);
          if (rc >= MAX_REMINDERS) { if (reminderRef.current) clearInterval(reminderRef.current); setShowHelpline(true); }
        }, REMINDER_INTERVAL);
      }
    }, intervalMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Handle "Reached" button ──────────────────────── */
  const handleReached = useCallback(() => {
    if (reminderRef.current) clearInterval(reminderRef.current);
    setReminderCount(0);
    setShowHelpline(false);

    // currentIdx = stop we just reached.
    // Begin animating FROM currentIdx TO currentIdx + 1.
    if (currentIdx >= stops.length - 1) {
      setPhase('completed');
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      return;
    }

    setPhase('transit');
    setTimeout(() => beginDemo(currentIdx), 800);
  }, [currentIdx, stops.length, beginDemo]);

  /* ─── Cleanup ───────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (reminderRef.current) clearInterval(reminderRef.current);
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      if (panTimerRef.current) clearTimeout(panTimerRef.current);
      stopMarkersRef.current.forEach(m => m.remove());
      stopMarkersRef.current = [];
      if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  /* ─── Transport display helpers ─────────────────────── */
  const transportIconEl = (mode: string) => {
    switch (mode) {
      case 'Flight': return <Plane className="w-4 h-4" />;
      case 'Train': return <Train className="w-4 h-4" />;
      case 'Bus': return <Bus className="w-4 h-4" />;
      case 'Car': return <Car className="w-4 h-4" />;
      case 'Walking': return <Footprints className="w-4 h-4" />;
      default: return <Navigation className="w-4 h-4" />;
    }
  };

  const transportColor = (mode: string) => {
    switch (mode) {
      case 'Flight': return 'bg-blue-500';
      case 'Train': return 'bg-emerald-500';
      case 'Bus': return 'bg-orange-500';
      case 'Car': return 'bg-purple-500';
      case 'Walking': return 'bg-teal-500';
      default: return 'bg-slate-500';
    }
  };

  const currentStop = stops[currentIdx] || null;
  const nextStop = stops[currentIdx + 1] || null;
  const progressPct = stops.length > 1 ? Math.round((currentIdx / (stops.length - 1)) * 100) : 0;

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col"
    >
      {/* ─── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-orange-500/20 bg-black/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Live Journey Tracking</h2>
            <p className="text-white/40 text-xs">{stops.length} stops &middot; Day {currentStop?.dayNumber || '\u2014'}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-orange-500/20 flex items-center justify-center text-white/60 hover:text-orange-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Map area ────────────────────────────────── */}
      <div className="flex-1 relative">
        {phase === 'geocoding' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-orange-500/30" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
            </div>
            <p className="text-white font-medium">Mapping your journey...</p>
            <p className="text-white/40 text-sm mt-1">Geocoding {geoProgress.done}/{geoProgress.total} stops</p>
            <div className="w-48 h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-orange-700 rounded-full transition-all duration-300" style={{ width: `${geoProgress.total > 0 ? (geoProgress.done / geoProgress.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Transport mode badge */}
        <AnimatePresence>
          {phase === 'transit' && currentTransportMode && (
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${transportColor(currentTransportMode)} text-white text-sm font-semibold shadow-lg`}>
                {transportIconEl(currentTransportMode)}
                <span>{currentTransportMode} Mode</span>
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === 'transit' && !currentTransportMode && (
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-semibold shadow-lg">
                <Footprints className="w-4 h-4" />
                <span>Exploring Locally</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-3">
          <div className="bg-black/70 backdrop-blur-md rounded-2xl p-3 border border-orange-500/20">
            <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
              <span>Stop {currentIdx + 1} of {stops.length}</span>
              <span className="text-orange-400 font-medium">{progressPct}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom card ─────────────────────────────── */}
      <div className="border-t border-orange-500/20 bg-black/90 backdrop-blur-xl">
        <AnimatePresence mode="wait">

          {phase === 'geocoding' && (
            <motion.div key="geo" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="px-5 py-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm">
                <MapPin className="w-4 h-4 animate-pulse" />
                Preparing your route...
              </div>
            </motion.div>
          )}

          {phase === 'transit' && nextStop && (
            <motion.div key="transit" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="px-5 py-4">
              <div className="flex items-center gap-3 mb-2">
                {currentTransportMode ? (
                  <div className={`w-9 h-9 rounded-lg ${transportColor(currentTransportMode)} flex items-center justify-center text-white shadow-lg`}>
                    {transportIconEl(currentTransportMode)}
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                    <Footprints className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/40 text-xs">{currentTransportMode ? `Heading via ${currentTransportMode}` : 'Moving to nearby location'}</p>
                  <p className="text-white font-semibold text-sm truncate">{nextStop.name}</p>
                </div>
              </div>
              {currentTransportMode && (
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <Clock className="w-3 h-3" /> <span>Travel in progress...</span>
                </div>
              )}
            </motion.div>
          )}

          {phase === 'waiting_confirmation' && currentStop && (
            <motion.div key="wait" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="px-5 py-4">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentStop.type === 'home' ? 'bg-red-500/20 text-red-400' : currentStop.type === 'station' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {currentStop.type === 'home' ? <Shield className="w-5 h-5" /> : currentStop.type === 'station' ? <Train className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base">{currentStop.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">{currentStop.location}</p>
                  {currentStop.description && <p className="text-white/25 text-xs mt-1 line-clamp-2">{currentStop.description}</p>}
                </div>
              </div>

              <button onClick={handleReached} className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${currentStop.type === 'home' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30'}`}>
                <CheckCircle className="w-5 h-5" />
                {currentStop.type === 'home' ? 'Safely Reached Home \u2014 Complete Journey' : 'Reached'}
              </button>

              {reminderCount > 0 && !showHelpline && (
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Reminder {reminderCount}/{MAX_REMINDERS} \u2014 Did you reach?</span>
                </div>
              )}

              {showHelpline && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                  <a href="tel:112" className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse">
                    <Phone className="w-5 h-5" />
                    Call Emergency Helpline (112)
                  </a>
                  <p className="text-center text-red-400/60 text-xs mt-1.5">No response detected \u2014 tap if you need help</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {phase === 'completed' && (
            <motion.div key="done" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="px-5 py-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-orange-500/40">
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-white text-xl font-bold mb-1">Journey Complete!</h3>
              <p className="text-white/40 text-sm mb-6">All {stops.length} stops done. Welcome home!</p>
              <button onClick={onClose} className="px-8 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 font-medium text-sm transition-colors">
                Close Tracking
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
