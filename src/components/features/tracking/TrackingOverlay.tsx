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
  isOriginStop?: boolean;
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

/* ─── Geocode via server proxy ────────────────────────── */
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
const STEPS_PER_SEG = 40;
const MS_PER_STEP = 75;

/* ─── Detect transport mode ───────────────────────────── */
function resolveTransportMode(actTitle: string, formData: any): string {
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

/* ─── Is this a transport-only activity? ──────────────── */
function isTransportOnly(type: string, name: string): boolean {
  if (type === 'transport' || type === 'TRANSPORT') return true;
  const n = (name || '').toLowerCase();
  return n.includes('flight to') || n.includes('train to') || n.includes('bus to') || n.includes('drive to');
}

/* ─── Build raw stops ──────────────────────────────────── */
function buildRawStops(
  trip: any,
  formData: any,
  originName: string
): Omit<ItineraryStop, 'lat' | 'lng' | 'isInterCity'>[] {
  const stops: Omit<ItineraryStop, 'lat' | 'lng' | 'isInterCity'>[] = [];
  const days = trip?.days || [];
  const destination = trip?.destination || formData?.destination || '';

  // Inject origin stop
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

  // Add actual itinerary stops — SKIP transport-only activities
  days.forEach((day: any, dayIdx: number) => {
    const dayNum = day.day || dayIdx + 1;
    (day.activities || []).forEach((act: any) => {
      // Skip transport activities — they're not real map stops
      if (isTransportOnly(act.type || '', act.title || '')) return;
      stops.push({
        name: act.title || 'Unnamed Stop',
        location: act.location || act.title || '',
        type: act.type || 'sightseeing',
        transportTo: '',
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
  const demoStartedRef = useRef(false);

  useEffect(() => { stopsRef.current = stops; }, [stops]);

  /* ─── Geocode all stops via server proxy ─── */
  useEffect(() => {
    let cancelled = false;
    const originName = formData?.origin || '';
    const destination = trip?.destination || formData?.destination || '';
    const raw = buildRawStops(trip, formData, originName);

    (async () => {
      setGeoProgress({ done: 0, total: raw.length });
      const geocoded: ItineraryStop[] = [];

      // Handle origin stop
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

      // Geocode remaining stops in batch
      const remainingRaw = raw.slice(1);
      const queries = remainingRaw.map((s) => s.location || s.name || '');
      const batchResults = await geocodeBatch(queries, destination);

      for (let i = 0; i < remainingRaw.length; i++) {
        if (cancelled) return;
        const s = remainingRaw[i];
        let coord = batchResults[i] ?? null;

        // Fallback: AI coords
        if (!coord) {
          let actIdx = 0;
          for (const day of trip?.days || []) {
            for (const act of day.activities || []) {
              if (actIdx + 1 === i + 1 && act.lat && act.lng) {
                coord = { lat: act.lat, lng: act.lng };
                break;
              }
              actIdx++;
            }
            if (coord) break;
          }
        }

        // Fallback: home stop → origin coords
        if (!coord && s.isHomeStop) {
          if (originLat && originLng) coord = { lat: originLat, lng: originLng };
          else if (geocoded.length > 0) coord = { lat: geocoded[0].lat, lng: geocoded[0].lng };
        }

        geocoded.push({ ...s, lat: coord?.lat ?? 0, lng: coord?.lng ?? 0, isInterCity: false });
        setGeoProgress({ done: i + 2, total: raw.length });
      }

      if (cancelled) return;

      // Mark inter-city legs (first leg always inter-city due to origin)
      for (let i = 1; i < geocoded.length; i++) {
        const dist = haversineKm(
          { lat: geocoded[i - 1].lat, lng: geocoded[i - 1].lng },
          { lat: geocoded[i].lat, lng: geocoded[i].lng }
        );
        geocoded[i].isInterCity =
          dist >= INTER_CITY_KM ||
          geocoded[i - 1].isOriginStop === true;
      }
      if (geocoded.length > 0) geocoded[0].isInterCity = false;

      setStops(geocoded);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, originLat, originLng]);

  /* ─── Init Map ───────────────────────────────────────── */
  useEffect(() => {
    if (stops.length === 0 || phase !== 'geocoding') return;
    if (mapRef.current) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const isDark = document.documentElement.classList.contains('dark');
      const styleUrl = isDark
        ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
        : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

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
        // Only use stops with valid coords (not 0,0)
        const validStops = stops.filter(s => s.lat !== 0 && s.lng !== 0);

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

          labelFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coord },
            properties: { label: stop.name },
          });
        });

        // Label layer — dark text with white halo for visibility on any map style
        if (labelFeatures.length > 0) {
          map.addSource('stop-labels', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: labelFeatures },
          });
          map.addLayer({
            id: 'stop-labels-layer',
            type: 'symbol',
            source: 'stop-labels',
            layout: {
              'text-field': ['get', 'label'],
              'text-size': 12,
              'text-font': ['Open Sans Bold', 'Arial Bold', 'sans-serif'],
              'text-anchor': 'top',
              'text-offset': [0, 1.2],
              'text-max-width': 8,
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            },
            paint: {
              'text-color': '#1a1a2e',
              'text-halo-color': '#ffffff',
              'text-halo-width': 2.5,
              'text-opacity': 1,
            },
          });
        }

        // Route lines
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

        setPhase('transit');
      });

      mapRef.current = map;
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  /* ─── Start demo once map + stops are both ready ──────── */
  useEffect(() => {
    if (phase !== 'transit') return;
    if (stopsRef.current.length === 0) return;
    if (demoStartedRef.current) return;
    if (!mapRef.current) return;
    demoStartedRef.current = true;
    const t = setTimeout(() => beginDemo(0), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stops]);

  /* ─── Demo engine ─────────────────────────────────────── */
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

    // Skip if current stop has no valid coords
    if (!from || (from.lat === 0 && from.lng === 0)) {
      setCurrentIdx(fromIdx + 1);
      setTimeout(() => beginDemo(fromIdx + 1), 200);
      return;
    }

    // Skip if next stop has no valid coords — jump to next valid
    if (!to || (to.lat === 0 && to.lng === 0)) {
      setCurrentIdx(fromIdx + 1);
      setTimeout(() => beginDemo(fromIdx + 1), 200);
      return;
    }

    // Set transport mode for inter-city legs
    if (to.isInterCity) {
      setCurrentTransportMode(from.isOriginStop ? (allStops[0]?.transportTo || '') : '');
    } else {
      setCurrentTransportMode('');
    }

    const map = mapRef.current;
    if (map && userMarkerRef.current) {
      const useTransport = to.isInterCity && to.transportTo;
      const newEl = useTransport ? makeTransportEl(to.transportTo) : makeUserEl();
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

  /* ─── Handle "Reached" — skip invalid stops ──────────── */
  const handleReached = useCallback(() => {
    if (reminderRef.current) clearInterval(reminderRef.current);
    setReminderCount(0);
    setShowHelpline(false);

    // Find next valid stop (skip 0,0 coords)
    let nextIdx = currentIdx + 1;
    while (nextIdx < stops.length) {
      const s = stops[nextIdx];
      if (s && s.lat !== 0 && s.lng !== 0) break;
      nextIdx++;
    }

    if (nextIdx >= stops.length) {
      setPhase('completed');
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      return;
    }

    setCurrentIdx(nextIdx);
    setPhase('transit');
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
  const realStopCount = Math.max(1, stops.length - 1);
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
