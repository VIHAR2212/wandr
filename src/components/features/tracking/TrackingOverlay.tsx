'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Navigation, CheckCircle, Phone, Clock, AlertTriangle,
  MapPin, Plane, Train, Bus, Car, Footprints, Shield
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/* ─── Types ─────────────────────────────────────────────── */
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

interface ItineraryStop {
  name: string;
  location: string;
  lat: number;
  lng: number;
  type: string;
  transportTo: string;
  isInterCity: boolean;
  dayNumber: number;
  time: string;
  description: string;
  isHomeStop?: boolean;
  isOriginStop?: boolean; // FIX (Feature): marks the injected origin→dest transit stop
}

/* ─── Haversine distance (km) ───────────────────────────── */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/* ─── FIX Bug 3: Geocode via server proxy (not Nominatim directly) ── */
// The client-side Nominatim call was returning wrong cities for generic names
// (e.g. "Akshardham Temple" → Delhi instead of Gujarat) because no destination
// context was appended. The server proxy at /api/geocode already handles this
// with a fallback retry that appends destination. Route all geocoding through it.
const geoCache = new Map<string, { lat: number; lng: number }>();

async function geocodeBatch(
  queries: string[],
  destination: string
): Promise<({ lat: number; lng: number } | null)[]> {
  if (queries.length === 0) return [];
  try {
    const res = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries, destination }),
    });
    if (!res.ok) return queries.map(() => null);
    const data = await res.json();
    // data.results is [number, number] | null  →  convert to {lat,lng}
    return (data.results as ([number, number] | null)[]).map((r) =>
      r ? { lat: r[1], lng: r[0] } : null
    );
  } catch {
    return queries.map(() => null);
  }
}

async function geocodeSingle(
  query: string,
  destination: string
): Promise<{ lat: number; lng: number } | null> {
  const key = `${query}|||${destination}`.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key)!;
  const [result] = await geocodeBatch([query], destination);
  if (result) geoCache.set(key, result);
  return result ?? null;
}

/* ─── Constants ─────────────────────────────────────────── */
const INTER_CITY_KM = 50;
const REMINDER_INTERVAL = 15000;
const MAX_REMINDERS = 5;
const PAN_THROTTLE = 400;

// FIX Bug 2: slow animation — 3000ms total per segment = 75ms per step at 40 steps
const STEPS_PER_SEG = 40;
const MS_PER_STEP = 75; // 40 × 75ms = 3000ms per segment (~3s)

/* ─── FIX Bug 4: Detect transport mode — prefer formData first ──── */
// Previously only read from act.title, causing "Flight" to appear even when
// user selected Train. Now formData.transportPreferences[0] takes priority
// for any inter-city leg.
function resolveTransportMode(actTitle: string, formData: any): string {
  // User's explicit primary transport preference wins for inter-city legs
  const prefs: string[] = formData?.transportPreferences ?? [];
  if (prefs.length > 0) {
    const primary = prefs[0].toUpperCase();
    if (primary === 'FLIGHT') return 'Flight';
    if (primary === 'TRAIN') return 'Train';
    if (primary === 'BUS') return 'Bus';
    if (primary === 'CAR_RENTAL') return 'Car';
    if (primary === 'TAXI') return 'Car';
    if (primary === 'METRO') return 'Train';
    if (primary === 'FERRY') return 'Ferry';
    if (primary === 'BICYCLE') return 'Walking';
  }
  // Fallback: read from activity title (original logic)
  return detectTransportModeFromTitle(actTitle);
}

function detectTransportModeFromTitle(title: string): string {
  const t = (title || '').toLowerCase();
  if (t.includes('flight') || t.includes('fly') || t.includes('airport')) return 'Flight';
  if (t.includes('train') || t.includes('rail') || t.includes('metro')) return 'Train';
  if (t.includes('bus') || t.includes('coach')) return 'Bus';
  if (t.includes('car') || t.includes('cab') || t.includes('taxi') || t.includes('drive')) return 'Car';
  if (t.includes('walk') || t.includes('foot')) return 'Walking';
  return 'Car';
}

/* ─── Build raw stops ──────────────────────────────────────
   FIX (Feature): prepend an origin→destination transit stop so the demo
   shows the inter-city journey FIRST before exploring local stops.
─────────────────────────────────────────────────────────── */
function buildRawStops(
  trip: any,
  formData: any,
  originName: string
): Omit<ItineraryStop, 'lat' | 'lng' | 'isInterCity'>[] {
  const stops: Omit<ItineraryStop, 'lat' | 'lng' | 'isInterCity'>[] = [];
  const days = trip?.days || [];
  const destination = trip?.destination || formData?.destination || '';

  // ── Inject origin→destination transit stop at position 0 ──
  // This makes the demo animate the travel arc first, then explore locally.
  const primaryMode = resolveTransportMode('', formData);
  stops.push({
    name: originName || formData?.origin || 'Home',
    location: formData?.origin || originName || 'Origin',
    type: 'origin',
    transportTo: primaryMode,
    dayNumber: 0,
    time: '',
    description: `Departing to ${destination}`,
    isOriginStop: true,
  });

  // ── Then add actual itinerary stops ──
  days.forEach((day: any, dayIdx: number) => {
    const dayNum = day.day || dayIdx + 1;
    (day.activities || []).forEach((act: any) => {
      stops.push({
        name: act.title || 'Unnamed Stop',
        location: act.location || act.title || '',
        type: act.type || 'sightseeing',
        // FIX Bug 4: use formData transport for inter-city legs
        transportTo:
          act.type === 'transport'
            ? resolveTransportMode(act.title, formData)
            : '',
        dayNumber: dayNum,
        time: act.time || '',
        description: act.description || '',
      });
    });
  });

  const lastDay = days[days.length - 1];
  const lastActs = lastDay?.activities || [];
  const lastLoc =
    lastActs.length > 0
      ? lastActs[lastActs.length - 1].location || lastActs[lastActs.length - 1].title
      : trip?.title || 'Home';

  stops.push({
    name: 'Home \u2014 Safe Return',
    location: lastLoc,
    type: 'hotel',
    transportTo: '',
    dayNumber: (lastDay?.day || days.length) + 0.5,
    time: '',
    description: `Complete your journey and return safely to ${trip?.title || 'Home'}`,
    isHomeStop: true,
  });

  return stops;
}

/* ─── Marker element factories ─────────────────────────── */
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
    Flight: '\u2708\uFE0F', Train: '\uD83D\uDE86', Bus: '\uD83D\uDE8C',
    Car: '\uD83D\uDE97', Walking: '\uD83D\uDEB6', Ferry: '\u26F4\uFE0F',
  };
  const emoji = emojis[mode] || '\uD83D\uDE97';
  const el = document.createElement('div');
  el.innerHTML = `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#F97316,#EA580C);display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 0 16px rgba(249,115,22,0.6),0 0 32px rgba(234,88,12,0.3);animation:tb 1.5s ease-in-out infinite;">
    <style>@keyframes tb{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}</style>
    ${emoji}
  </div>`;
  return el;
}

/* ─── Component ─────────────────────────────────────────── */
export function TrackingOverlay({ tripData, onClose }: { tripData: TrackingTripData; onClose: () => void }) {
  const trip = tripData?.generatedTrip;
  const originLat = tripData?.originLat;
  const originLng = tripData?.originLng;
  const formData = tripData?.formData;

  const [phase, setPhase] = useState<'geocoding' | 'transit' | 'waiting_confirmation' | 'completed'>('geocoding');
  const [stops, setStops] = useState<ItineraryStop[]>([]);
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
  const stopsRef = useRef<ItineraryStop[]>([]);
  // FIX Bug 2: track whether beginDemo has been called to avoid double-start
  const demoStartedRef = useRef(false);

  useEffect(() => { stopsRef.current = stops; }, [stops]);

  /* ─── FIX Bug 3: Geocode all stops via server proxy ─── */
  useEffect(() => {
    let cancelled = false;
    const originName = formData?.origin || '';
    const destination = trip?.destination || formData?.destination || '';
    const raw = buildRawStops(trip, formData, originName);

    (async () => {
      setGeoProgress({ done: 0, total: raw.length });

      // ── Handle origin stop (index 0) using provided coords or geocoding ──
      const geocoded: ItineraryStop[] = [];

      // Try to use pre-resolved originLat/Lng first for the origin stop
      let originCoord: { lat: number; lng: number } | null = null;
      if (originLat && originLng) {
        originCoord = { lat: originLat, lng: originLng };
      } else if (raw[0]?.location) {
        originCoord = await geocodeSingle(raw[0].location, destination);
      }
      geocoded.push({
        ...raw[0],
        lat: originCoord?.lat ?? 0,
        lng: originCoord?.lng ?? 0,
        isInterCity: false,
      });
      setGeoProgress({ done: 1, total: raw.length });

      // ── Geocode remaining stops in a single batch via server proxy ──
      // This fixes Bug 3: server proxy appends destination as context,
      // so "Akshardham Temple" resolves to Gujarat, not Delhi.
      const remainingRaw = raw.slice(1);
      const queries = remainingRaw.map((s) => s.location || s.name || '');

      // Batch geocode (server handles 1-req/sec throttle)
      const batchResults = await geocodeBatch(queries, destination);

      for (let i = 0; i < remainingRaw.length; i++) {
        if (cancelled) return;
        const s = remainingRaw[i];
        let coord = batchResults[i] ?? null;

        // Fallback 1: check if act already has lat/lng from AI generation
        if (!coord) {
          let actIdx = 0;
          for (const day of trip?.days || []) {
            for (const act of day.activities || []) {
              // +1 offset because raw[0] is the injected origin stop
              if (actIdx + 1 === i + 1 && act.lat && act.lng) {
                coord = { lat: act.lat, lng: act.lng };
                break;
              }
              actIdx++;
            }
            if (coord) break;
          }
        }

        // Fallback 2: home stop → use originLat/Lng
        if (!coord && s.isHomeStop) {
          if (originLat && originLng) coord = { lat: originLat, lng: originLng };
          else if (geocoded.length > 0) coord = { lat: geocoded[0].lat, lng: geocoded[0].lng };
        }

        geocoded.push({ ...s, lat: coord?.lat ?? 0, lng: coord?.lng ?? 0, isInterCity: false });
        setGeoProgress({ done: i + 2, total: raw.length });
      }

      if (cancelled) return;

      // ── Mark inter-city legs ──
      for (let i = 1; i < geocoded.length; i++) {
        const dist = haversineKm(
          { lat: geocoded[i - 1].lat, lng: geocoded[i - 1].lng },
          { lat: geocoded[i].lat, lng: geocoded[i].lng }
        );
        geocoded[i].isInterCity =
          dist >= INTER_CITY_KM ||
          geocoded[i].type === 'transport' ||
          geocoded[i - 1].isOriginStop === true; // always mark first leg as inter-city
      }
      if (geocoded.length > 0) geocoded[0].isInterCity = false;

      setStops(geocoded);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, originLat, originLng]);

  /* ─── FIX Bug 2: Init Map — use map.once('load') reliably ─────── */
  // Previously `beginDemo(0)` was called inside the load handler but
  // `stopsRef.current` was not yet populated if `setStops` hadn't flushed.
  // Fix: separate concerns — map init here, demo start in a separate effect
  // that watches for both `stops` being populated AND `phase === 'geocoding'`.
  useEffect(() => {
    if (stops.length === 0 || phase !== 'geocoding') return;
    if (mapRef.current) return; // already initialised

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const isDark = document.documentElement.classList.contains('dark');
      const styleUrl = isDark
        ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
        : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: [stops[0].lng || 72.877, stops[0].lat || 19.076],
        zoom: 13,
        attributionControl: false,
      });

      try { (map as any).setProjection({ type: 'globe' }); } catch {}

      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
      map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: true }), 'bottom-right');

      map.once('load', () => {
        const allCoords: [number, number][] = [];
        const validStops = stops.filter(s => !(s.lat === 0 && s.lng === 0));

        // ── FIX Bug 1: Add stop label layer so place names are visible ──
        // The original code only added dot markers without any text/symbol layer.
        // We now add a GeoJSON source + symbol layer for labels.
        const labelFeatures: any[] = [];

        validStops.forEach((stop) => {
          const coord: [number, number] = [stop.lng, stop.lat];
          allCoords.push(coord);

          let dotColor = '#F97316';
          if (stop.type === 'restaurant') dotColor = '#22C55E';
          if (stop.type === 'transport') dotColor = '#3B82F6';
          if (stop.type === 'hiddenGem') dotColor = '#A855F7';
          if (stop.isHomeStop) dotColor = '#EF4444';
          if (stop.isOriginStop) dotColor = '#F97316';

          const sz = 8;
          const dotEl = document.createElement('div');
          dotEl.innerHTML = `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${dotColor};border:2px solid white;box-shadow:0 0 4px ${dotColor}80;transition:all .3s;"></div>`;

          const marker = new maplibregl.Marker({ element: dotEl })
            .setLngLat(coord)
            .setPopup(
              new maplibregl.Popup({ offset: 25, closeButton: false })
                .setHTML(`<b>${stop.name}</b><br><small>${stop.location}</small>`)
            )
            .addTo(map);

          stopMarkersRef.current.push(marker);

          // Collect for label layer
          labelFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coord },
            properties: {
              label: stop.name,
              // offset so label doesn't overlap the dot
              textOffset: stop.isHomeStop || stop.isOriginStop ? [0, -1.5] : [0, 1.5],
            },
          });
        });

        // ── Add label GeoJSON source ──
        map.addSource('stop-labels', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: labelFeatures,
          },
        });

        // ── Add symbol layer for place name labels ──
        // This was the missing piece causing Bug 1.
        map.addLayer({
          id: 'stop-labels-layer',
          type: 'symbol',
          source: 'stop-labels',
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 11,
            'text-font': ['Noto Sans Regular', 'Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-anchor': 'top',
            'text-offset': [0, 1.0],
            'text-max-width': 10,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1.5,
            'text-opacity': 0.9,
          },
        });

        // ── Route lines ──
        if (allCoords.length > 1) {
          const routeGeo: any = {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: allCoords },
            properties: {},
          };

          map.addSource('tracking-route-glow', { type: 'geojson', data: routeGeo });
          map.addLayer({
            id: 'tracking-route-glow', type: 'line', source: 'tracking-route-glow',
            paint: { 'line-color': '#F97316', 'line-width': 6, 'line-opacity': 0.2 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          });

          map.addSource('tracking-route-main', { type: 'geojson', data: routeGeo });
          map.addLayer({
            id: 'tracking-route-main', type: 'line', source: 'tracking-route-main',
            paint: { 'line-color': '#EA580C', 'line-width': 3, 'line-opacity': 0.6, 'line-dasharray': [8, 12] },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          });

          const bounds = new maplibregl.LngLatBounds();
          allCoords.forEach(c => bounds.extend(c));
          map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
        }

        const firstCoord: [number, number] = allCoords[0] || [72.877, 19.076];
        userMarkerRef.current = new maplibregl.Marker({ element: makeUserEl() })
          .setLngLat(firstCoord)
          .addTo(map);

        trailCoords.current = [firstCoord];
        map.addSource('tracking-trail', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: trailCoords.current },
            properties: {},
          },
        });
        map.addLayer({
          id: 'tracking-trail-line', type: 'line', source: 'tracking-trail',
          paint: { 'line-color': '#F97316', 'line-width': 4, 'line-opacity': 0.8 },
          layout: { 'line-cap': 'round', 'line-join': 'round' },
        });

        // FIX Bug 2: transition phase AFTER map is fully ready, then
        // a separate effect will call beginDemo(0)
        setPhase('transit');
      });

      mapRef.current = map;
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  /* ─── FIX Bug 2: Start demo once map+stops are both ready ──────── */
  // The original code called beginDemo(0) inside the load handler, but
  // stopsRef.current might not be up to date yet. By watching phase change
  // to 'transit' AND stopsRef being populated, we guarantee the animation
  // starts with correct data.
  useEffect(() => {
    if (phase !== 'transit') return;
    if (stopsRef.current.length === 0) return;
    if (demoStartedRef.current) return;
    if (!mapRef.current) return;
    demoStartedRef.current = true;
    // Small delay to ensure map tiles are rendered before panning
    const t = setTimeout(() => beginDemo(0), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stops]);

  /* ─── Demo engine ───────────────────────────────────────
     FIX Bug 2: was using setInterval at 300ms for 40 steps = 12s but
     the interval was being cleared/reset incorrectly causing 0% stuck.
     Now uses MS_PER_STEP=75ms × 40 steps = 3s per segment, and properly
     guards against stale closure over stopsRef.
  ─────────────────────────────────────────────────────── */
  const beginDemo = useCallback((fromIdx: number) => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }

    const allStops = stopsRef.current;
    if (!allStops || fromIdx >= allStops.length - 1) {
      setPhase('completed');
      return;
    }

    const from = allStops[fromIdx];
    const to = allStops[fromIdx + 1];
    if (!from || (from.lat === 0 && from.lng === 0)) {
      // Skip this stop if no coords
      setCurrentIdx(fromIdx + 1);
      setTimeout(() => beginDemo(fromIdx + 1), 200);
      return;
    }

    // FIX Bug 4: transport mode already resolved in buildRawStops via
    // resolveTransportMode, so to.transportTo is already correct here
    if (to.isInterCity && to.transportTo) {
      setCurrentTransportMode(to.transportTo);
    } else {
      setCurrentTransportMode('');
    }

    const map = mapRef.current;
    if (map && userMarkerRef.current) {
      const newEl =
        to.isInterCity && to.transportTo
          ? makeTransportEl(to.transportTo)
          : makeUserEl();
      userMarkerRef.current.remove();
      userMarkerRef.current = new maplibregl.Marker({ element: newEl })
        .setLngLat([from.lng, from.lat])
        .addTo(map);
    }

    let step = 0;

    demoIntervalRef.current = setInterval(() => {
      // Always read from ref, not closure, to avoid stale data
      const s = stopsRef.current;
      if (!s || fromIdx >= s.length - 1) {
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
        return;
      }

      const progress = step / STEPS_PER_SEG;
      const lat = from.lat + (to.lat - from.lat) * progress;
      const lng = from.lng + (to.lng - from.lng) * progress;
      const coord: [number, number] = [lng, lat];

      const currentMap = mapRef.current;
      if (currentMap && userMarkerRef.current) {
        userMarkerRef.current.setLngLat(coord);

        trailCoords.current.push(coord);
        const src = currentMap.getSource('tracking-trail') as maplibregl.GeoJSONSource;
        src?.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [...trailCoords.current] },
          properties: {},
        });

        if (!panTimerRef.current) {
          panTimerRef.current = setTimeout(() => {
            currentMap.panTo(coord, { animate: true, duration: 400 });
            panTimerRef.current = null;
          }, PAN_THROTTLE);
        }
      }

      step++;

      if (step > STEPS_PER_SEG) {
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;

        // Snap marker exactly to destination
        if (mapRef.current && userMarkerRef.current) {
          userMarkerRef.current.setLngLat([to.lng, to.lat]);
        }

        setCurrentIdx(fromIdx + 1);
        setPhase('waiting_confirmation');

        let rc = 0;
        if (reminderRef.current) clearInterval(reminderRef.current);
        reminderRef.current = setInterval(() => {
          rc++;
          setReminderCount(rc);
          if (rc >= MAX_REMINDERS) {
            if (reminderRef.current) clearInterval(reminderRef.current);
            setShowHelpline(true);
          }
        }, REMINDER_INTERVAL);
      }
    }, MS_PER_STEP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Handle "Reached" ──────────────────────────────── */
  const handleReached = useCallback(() => {
    if (reminderRef.current) clearInterval(reminderRef.current);
    setReminderCount(0);
    setShowHelpline(false);
    const nextIdx = currentIdx + 1;
    if (nextIdx >= stops.length) {
      setPhase('completed');
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      return;
    }
    setCurrentIdx(nextIdx);
    setPhase('transit');
    // FIX Bug 2: reset demoStarted guard so the transit effect re-fires
    demoStartedRef.current = false;
    setTimeout(() => {
      demoStartedRef.current = true;
      beginDemo(nextIdx);
    }, 800);
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
  // Subtract 1 from progress because index 0 is the injected origin stop (not a "real" destination stop)
  const realStopCount = Math.max(1, stops.length - 1);
  const displayIdx = Math.max(0, currentIdx - 1); // shown index excludes origin
  const progressPct = stops.length > 1 ? Math.round((currentIdx / (stops.length - 1)) * 100) : 0;

  /* ─── Render ────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-orange-500/20 bg-black/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Live Journey Tracking</h2>
            <p className="text-white/40 text-xs">
              {realStopCount} stops &middot; Day {currentStop?.dayNumber || '\u2014'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-orange-500/20 flex items-center justify-center text-white/60 hover:text-orange-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 relative">
        {phase === 'geocoding' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-orange-500/30" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
            </div>
            <p className="text-white font-medium">Mapping your journey...</p>
            <p className="text-white/40 text-sm mt-1">
              Geocoding {geoProgress.done}/{geoProgress.total} stops
            </p>
            <div className="w-48 h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-700 rounded-full transition-all duration-300"
                style={{ width: `${geoProgress.total > 0 ? (geoProgress.done / geoProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full" />

        <AnimatePresence>
          {phase === 'transit' && currentTransportMode && (
            <motion.div
              initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
            >
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
            <motion.div
              initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-semibold shadow-lg">
                <Footprints className="w-4 h-4" />
                <span>Exploring Locally</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-3">
          <div className="bg-black/70 backdrop-blur-md rounded-2xl p-3 border border-orange-500/20">
            <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
              <span>Stop {currentIdx + 1} of {stops.length}</span>
              <span className="text-orange-400 font-medium">{progressPct}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

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
                  <p className="text-white/40 text-xs">
                    {currentTransportMode ? `Heading via ${currentTransportMode}` : 'Moving to nearby location'}
                  </p>
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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentStop.isHomeStop ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {currentStop.isHomeStop ? <Shield className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base">{currentStop.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">{currentStop.location}</p>
                  {currentStop.description && (
                    <p className="text-white/25 text-xs mt-1 line-clamp-2">{currentStop.description}</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleReached}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  currentStop.isHomeStop
                    ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                {currentStop.isHomeStop
                  ? 'Safely Reached Home \u2014 Complete Journey'
                  : 'Reached'}
              </button>

              {reminderCount > 0 && !showHelpline && (
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Reminder {reminderCount}/{MAX_REMINDERS} \u2014 Did you reach?</span>
                </div>
              )}

              {showHelpline && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                  <a
                    href="tel:112"
                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse"
                  >
                    <Phone className="w-5 h-5" />
                    Call Emergency Helpline (112)
                  </a>
                  <p className="text-center text-red-400/60 text-xs mt-1.5">
                    No response detected \u2014 tap if you need help
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {phase === 'completed' && (
            <motion.div key="done" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="px-5 py-8 text-center">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-orange-500/40"
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-white text-xl font-bold mb-1">Journey Complete!</h3>
              <p className="text-white/40 text-sm mb-6">
                All {realStopCount} stops done. Welcome home!
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 font-medium text-sm transition-colors"
              >
                Close Tracking
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
