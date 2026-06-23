'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Navigation, CheckCircle, Phone, Clock, AlertTriangle,
  MapPin, Plane, Train, Bus, Car, Footprints, Shield
} from 'lucide-react';

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
  type: string;            // sightseeing | hotel | restaurant | transport | hiddenGem
  transportTo: string;     // "Flight" | "Train" | "Bus" | "Car" etc — only meaningful when isInterCity
  isInterCity: boolean;    // TRUE = show transport icon; FALSE = show user icon (local travel)
  dayNumber: number;
  time: string;
  description: string;
  isHomeStop?: boolean;    // final "safe return home" stop
}

/* ─── Haversine distance (km) ───────────────────────────── */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/* ─── Nominatim geocode (cached) ────────────────────────── */
const geoCache = new Map<string, { lat: number; lng: number }>();
async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = query.toLowerCase().trim();
  if (geoCache.has(key)) return geoCache.get(key)!;

  const attempts = [query, `${query}, India`];
  for (const q of attempts) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { 'User-Agent': 'WandrTravel/1.0' } }
      );
      const data = await res.json();
      if (data?.[0]) {
        const coord = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geoCache.set(key, coord);
        return coord;
      }
    } catch {
      /* continue to next attempt */
    }
  }
  return null;
}

/* ─── Constants ─────────────────────────────────────────── */
const INTER_CITY_KM = 50;       // >= 50 km between stops = inter-city travel
const REMINDER_INTERVAL = 15000; // 15 seconds
const MAX_REMINDERS = 5;
const PAN_THROTTLE = 400;
const MOVE_THRESHOLD = 0.0002;  // ~20m — skip tiny GPS jitter

/* ─── Build raw stops (no isInterCity yet) ─────────────── */
function buildRawStops(trip: any): Omit<ItineraryStop, 'lat' | 'lng' | 'isInterCity'>[] {
  const stops: Omit<ItineraryStop, 'lat' | 'lng' | 'isInterCity'>[] = [];
  const days = trip?.days || [];

  days.forEach((day: any, dayIdx: number) => {
    const dayNum = day.day || dayIdx + 1;
    (day.activities || []).forEach((act: any) => {
      const loc = act.location || act.title || '';
      const transportTo = act.type === 'transport' ? detectTransportMode(act.title) : '';
      stops.push({
        name: act.title || 'Unnamed Stop',
        location: loc,
        type: act.type || 'sightseeing',
        transportTo,
        dayNumber: dayNum,
        time: act.time || '',
        description: act.description || '',
      });
    });
  });

  // Final "Home — Safe Return" stop
  const lastDay = days[days.length - 1];
  const lastActs = lastDay?.activities || [];
  const lastLoc = lastActs.length > 0 ? (lastActs[lastActs.length - 1].location || lastActs[lastActs.length - 1].title) : (trip?.title || 'Home');
  const dest = trip?.title || 'Home';
  stops.push({
    name: 'Home — Safe Return',
    location: lastLoc,
    type: 'hotel',
    transportTo: '',
    dayNumber: (lastDay?.day || days.length) + 0.5,
    time: '',
    description: `Complete your journey and return safely to ${dest}`,
    isHomeStop: true,
  });

  return stops;
}

function detectTransportMode(title: string): string {
  const t = (title || '').toLowerCase();
  if (t.includes('flight') || t.includes('fly') || t.includes('airport')) return 'Flight';
  if (t.includes('train') || t.includes('rail') || t.includes('metro')) return 'Train';
  if (t.includes('bus') || t.includes('coach')) return 'Bus';
  if (t.includes('car') || t.includes('cab') || t.includes('taxi') || t.includes('drive')) return 'Car';
  if (t.includes('walk') || t.includes('foot')) return 'Footprints';
  return 'Car';
}

/* ─── Component ─────────────────────────────────────────── */
export function TrackingOverlay({ tripData, onClose }: { tripData: TrackingTripData; onClose: () => void }) {
  const trip = tripData?.generatedTrip;
  const originLat = tripData?.originLat;
  const originLng = tripData?.originLng;

  // State
  const [phase, setPhase] = useState<'geocoding' | 'transit' | 'waiting_confirmation' | 'completed'>('geocoding');
  const [stops, setStops] = useState<ItineraryStop[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [currentTransportMode, setCurrentTransportMode] = useState<string>('');
  const [reminderCount, setReminderCount] = useState(0);
  const [showHelpline, setShowHelpline] = useState(false);
  const [geoProgress, setGeoProgress] = useState({ done: 0, total: 0 });
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.076, 72.877]);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const trailLineRef = useRef<any>(null);
  const stopMarkersRef = useRef<any>(null);
  const reminderRef = useRef<any>(null);
  const panTimerRef = useRef<any>(null);
  const posIntervalRef = useRef<any>(null);
  const demoIntervalRef = useRef<any>(null);
  const stopsRef = useRef<ItineraryStop[]>([]);

  // Keep stopsRef in sync
  useEffect(() => { stopsRef.current = stops; }, [stops]);

  /* ─── Init: geocode all stops then determine isInterCity ─── */
  useEffect(() => {
    let cancelled = false;
    const raw = buildRawStops(trip);

    (async () => {
      setGeoProgress({ done: 0, total: raw.length });

      // Geocode each stop
      const geocoded: ItineraryStop[] = [];
      for (let i = 0; i < raw.length; i++) {
        if (cancelled) return;
        const s = raw[i];

        // Try geocoding the location string
        let coord = await geocode(s.location);

        // Fallback: use provided lat/lng if available from activity data
        if (!coord) {
          const days = trip?.days || [];
          let actIdx = 0;
          for (const day of days) {
            for (const act of day.activities || []) {
              if (actIdx === i && act.lat && act.lng) {
                coord = { lat: act.lat, lng: act.lng };
                break;
              }
              actIdx++;
            }
            if (coord) break;
          }
        }

        // Fallback: for the home stop, use origin or first known coordinate
        if (!coord && s.isHomeStop) {
          if (originLat && originLng) coord = { lat: originLat, lng: originLng };
          else if (geocoded.length > 0) coord = { lat: geocoded[0].lat, lng: geocoded[0].lng };
        }

        geocoded.push({
          ...s,
          lat: coord?.lat ?? 0,
          lng: coord?.lng ?? 0,
          isInterCity: false, // will be set below
        });

        setGeoProgress({ done: i + 1, total: raw.length });
      }

      if (cancelled) return;

      // ── Now determine isInterCity using DISTANCE between consecutive stops ──
      for (let i = 1; i < geocoded.length; i++) {
        const prev = geocoded[i - 1];
        const curr = geocoded[i];
        const dist = haversineKm(
          { lat: prev.lat, lng: prev.lng },
          { lat: curr.lat, lng: curr.lng }
        );

        // If distance >= INTER_CITY_KM, this stop is reached via inter-city travel
        // Also respect the activity type — transport activities between cities
        const isTransportAct = curr.type === 'transport';
        curr.isInterCity = dist >= INTER_CITY_KM || isTransportAct;
      }
      // First stop is never inter-city (starting point)
      if (geocoded.length > 0) geocoded[0].isInterCity = false;

      setStops(geocoded);

      // Set initial map center to first stop
      if (geocoded.length > 0 && geocoded[0].lat !== 0) {
        setMapCenter([geocoded[0].lat, geocoded[0].lng]);
      }
    })();

    return () => { cancelled = true; };
  }, [trip, originLat, originLng]);

  /* ─── Initialize Leaflet map after geocoding ─────────── */
  useEffect(() => {
    if (stops.length === 0 || phase !== 'geocoding') return;

    const timer = setTimeout(async () => {
      // Dynamically import leaflet (avoid SSR)
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current || leafletMapRef.current) return;

      // Colored tile layer — Voyager style for vibrant look
      const map = L.map(mapRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        attributionControl: false,
      }).setView(mapCenter, 13);

      // Vibrant colored map tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Layer group for stop markers
      const stopGroup = L.layerGroup().addTo(map);
      stopMarkersRef.current = stopGroup;

      // Plot all stop dots
      const allCoords: [number, number][] = [];
      stops.forEach((stop, idx) => {
        if (stop.lat === 0 && stop.lng === 0) return;
        const coord: [number, number] = [stop.lat, stop.lng];
        allCoords.push(coord);

        // Color based on type
        let dotColor = '#14B8A6'; // teal for attractions
        if (stop.type === 'hotel') dotColor = '#F97316';
        if (stop.type === 'restaurant') dotColor = '#22C55E';
        if (stop.type === 'transport') dotColor = '#3B82F6';
        if (stop.type === 'hiddenGem') dotColor = '#A855F7';
        if (stop.isHomeStop) dotColor = '#EF4444'; // red for home

        const isVisited = idx < 1; // only first stop visited initially
        const opacity = isVisited ? 1 : 0.5;
        const size = isVisited ? 12 : 8;

        const icon = L.divIcon({
          html: `<div style="
            width:${size}px; height:${size}px; border-radius:50%;
            background:${dotColor}; border:2px solid white;
            box-shadow:0 0 ${isVisited ? '8px' : '4px'} ${dotColor}80;
            transition: all 0.3s ease;
          "></div>`,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        L.marker(coord, { icon })
          .addTo(stopGroup)
          .bindPopup(`<b>${stop.name}</b><br><small>${stop.location}</small>`);
      });

      // Draw route line with gradient-like color (polyline decoration)
      if (allCoords.length > 1) {
        // Outer glow line
        L.polyline(allCoords, {
          color: '#6366F1',
          weight: 6,
          opacity: 0.2,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        // Main route line
        L.polyline(allCoords, {
          color: '#8B5CF6',
          weight: 3,
          opacity: 0.6,
          dashArray: '8, 12',
        }).addTo(map);
      }

      // Fit bounds
      if (allCoords.length > 1) {
        map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 14 });
      }

      // User marker (golden pulsing dot)
      const firstCoord = allCoords[0] || mapCenter;
      const userIcon = L.divIcon({
        html: `
          <div style="position:relative; width:44px; height:44px;">
            <div style="
              position:absolute; inset:0; border-radius:50%;
              background: radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%);
              animation: pulse-ring 2s ease-out infinite;
            "></div>
            <div style="
              position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
              width:20px; height:20px; border-radius:50%;
              background: linear-gradient(135deg, #FFD700, #FFA500);
              border:3px solid white;
              box-shadow: 0 0 12px rgba(255,215,0,0.7), 0 2px 6px rgba(0,0,0,0.3);
            "></div>
            <style>
              @keyframes pulse-ring {
                0% { transform:scale(0.8); opacity:0.8; }
                100% { transform:scale(2.2); opacity:0; }
              }
            </style>
          </div>
        `,
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      userMarkerRef.current = L.marker(firstCoord, { icon: userIcon, zIndexOffset: 2000 }).addTo(map);

      // Trail line (animated path behind user)
      trailLineRef.current = L.polyline([firstCoord], {
        color: '#FBBF24',
        weight: 4,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      leafletMapRef.current = map;

      // Transition to transit phase
      setPhase('transit');
      startDemoMovement();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  /* ─── Create transport icon ──────────────────────────── */
  const createTransportIcon = useCallback((mode: string) => {
    const L = require('leaflet');
    const emojis: Record<string, string> = {
      Flight: '✈️', Train: '🚆', Bus: '🚌', Car: '🚗', Footprints: '🚶',
    };
    const emoji = emojis[mode] || '🚗';
    return L.divIcon({
      html: `
        <div style="
          width:48px; height:48px; border-radius:50%;
          background: linear-gradient(135deg, #3B82F6, #6366F1);
          display:flex; align-items:center; justify-content:center;
          font-size:20px; border:3px solid white;
          box-shadow: 0 0 16px rgba(59,130,246,0.6), 0 0 32px rgba(99,102,241,0.3);
          animation: transport-bounce 1.5s ease-in-out infinite;
          position:relative;
        ">
          <style>
            @keyframes transport-bounce {
              0%,100% { transform:translateY(0); }
              50% { transform:translateY(-4px); }
            }
          </style>
          ${emoji}
        </div>
      `,
      className: '',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  }, []);

  const createUserIcon = useCallback(() => {
    const L = require('leaflet');
    return L.divIcon({
      html: `
        <div style="position:relative; width:44px; height:44px;">
          <div style="
            position:absolute; inset:0; border-radius:50%;
            background: radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%);
            animation: pulse-ring2 2s ease-out infinite;
          "></div>
          <div style="
            position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
            width:20px; height:20px; border-radius:50%;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            border:3px solid white;
            box-shadow: 0 0 12px rgba(255,215,0,0.7), 0 2px 6px rgba(0,0,0,0.3);
          "></div>
          <style>
            @keyframes pulse-ring2 {
              0% { transform:scale(0.8); opacity:0.8; }
              100% { transform:scale(2.2); opacity:0; }
            }
          </style>
        </div>
      `,
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }, []);

  /* ─── Demo movement (simulates GPS) ──────────────────── */
  const startDemoMovement = useCallback(() => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    if (stopsRef.current.length < 2) return;

    let segIdx = 0;
    let step = 0;
    const stepsPerSegment = 40;

    const tick = () => {
      const allStops = stopsRef.current;
      if (!allStops || segIdx >= allStops.length - 1) {
        clearInterval(demoIntervalRef.current);
        return;
      }

      const from = allStops[segIdx];
      const to = allStops[segIdx + 1];
      if (from.lat === 0 && from.lng === 0) { segIdx++; step = 0; return; }

      const progress = step / stepsPerSegment;
      const lat = from.lat + (to.lat - from.lat) * progress;
      const lng = from.lng + (to.lng - from.lng) * progress;

      setUserPos({ lat, lng });

      // Update transport mode based on NEXT stop's isInterCity
      const nextStop = to;
      if (nextStop.isInterCity && nextStop.transportTo) {
        setCurrentTransportMode(nextStop.transportTo);
      } else {
        setCurrentTransportMode(''); // local travel — no transport icon
      }

      // Update map marker
      const map = leafletMapRef.current;
      const L = require('leaflet');
      if (map && userMarkerRef.current) {
        // Switch icon: transport vs user
        const isInterCity = nextStop.isInterCity && nextStop.transportTo;
        if (isInterCity) {
          userMarkerRef.current.setIcon(createTransportIcon(nextStop.transportTo));
        } else {
          userMarkerRef.current.setIcon(createUserIcon());
        }
        userMarkerRef.current.setLatLng([lat, lng]);

        // Trail line
        if (trailLineRef.current) {
          const pts = trailLineRef.current.getLatLngs() as any[];
          pts.push(L.latLng(lat, lng));
          trailLineRef.current.setLatLngs(pts);
        }

        // Throttled panning
        if (!panTimerRef.current) {
          panTimerRef.current = setTimeout(() => {
            map.panTo([lat, lng], { animate: true, duration: 0.4 });
            panTimerRef.current = null;
          }, PAN_THROTTLE);
        }
      }

      step++;
      if (step >= stepsPerSegment) {
        // Arrived at next stop
        setCurrentIdx(segIdx + 1);
        setPhase('waiting_confirmation');
        clearInterval(demoIntervalRef.current);

        // Start reminder timer
        let reminders = 0;
        reminderRef.current = setInterval(() => {
          reminders++;
          setReminderCount(reminders);
          if (reminders >= MAX_REMINDERS) {
            clearInterval(reminderRef.current);
            setShowHelpline(true);
          }
        }, REMINDER_INTERVAL);
      }
    };

    demoIntervalRef.current = setInterval(tick, 300);
  }, [createTransportIcon, createUserIcon]);

  /* ─── Handle "Reached" button ────────────────────────── */
  const handleReached = useCallback(() => {
    if (reminderRef.current) clearInterval(reminderRef.current);
    setReminderCount(0);
    setShowHelpline(false);

    const nextIdx = currentIdx + 1;
    if (nextIdx >= stops.length) {
      // Journey complete!
      setPhase('completed');
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      return;
    }

    // Update the stop marker to "visited" style
    const L = require('leaflet');
    if (stopMarkersRef.current && leafletMapRef.current) {
      stopMarkersRef.current.eachLayer((layer: any) => {
        // Just re-render all markers with updated visited state
      });
    }

    setCurrentIdx(nextIdx);
    setPhase('transit');

    // Continue demo movement to next segment
    setTimeout(() => {
      if (stopsRef.current.length > nextIdx) {
        let step = 0;
        const segIdx = nextIdx - 1; // move FROM current TO next
        // Actually we need to continue from currentIdx to nextIdx
        // The demo should go from stops[currentIdx] to stops[nextIdx]
      }
      startDemoMovementFrom(nextIdx);
    }, 800);
  }, [currentIdx, stops.length]);

  /* ─── Start movement from a specific index ──────────── */
  const startDemoMovementFrom = useCallback((fromIdx: number) => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    const allStops = stopsRef.current;
    if (!allStops || fromIdx >= allStops.length - 1) {
      setPhase('completed');
      return;
    }

    let step = 0;
    const stepsPerSegment = 40;

    const tick = () => {
      const stops = stopsRef.current;
      if (!stops || fromIdx >= stops.length - 1) {
        clearInterval(demoIntervalRef.current);
        return;
      }

      const from = stops[fromIdx];
      const to = stops[fromIdx + 1];
      if (from.lat === 0 && from.lng === 0) {
        clearInterval(demoIntervalRef.current);
        return;
      }

      const progress = step / stepsPerSegment;
      const lat = from.lat + (to.lat - from.lat) * progress;
      const lng = from.lng + (to.lng - from.lng) * progress;

      setUserPos({ lat, lng });

      // Transport mode: only for inter-city segments
      if (to.isInterCity && to.transportTo) {
        setCurrentTransportMode(to.transportTo);
      } else {
        setCurrentTransportMode('');
      }

      // Update marker
      const map = leafletMapRef.current;
      const L = require('leaflet');
      if (map && userMarkerRef.current) {
        const isInterCity = to.isInterCity && to.transportTo;
        if (isInterCity) {
          userMarkerRef.current.setIcon(createTransportIcon(to.transportTo));
        } else {
          userMarkerRef.current.setIcon(createUserIcon());
        }
        userMarkerRef.current.setLatLng([lat, lng]);

        if (trailLineRef.current) {
          const pts = trailLineRef.current.getLatLngs() as any[];
          pts.push(L.latLng(lat, lng));
          trailLineRef.current.setLatLngs(pts);
        }

        if (!panTimerRef.current) {
          panTimerRef.current = setTimeout(() => {
            map.panTo([lat, lng], { animate: true, duration: 0.4 });
            panTimerRef.current = null;
          }, PAN_THROTTLE);
        }
      }

      step++;
      if (step >= stepsPerSegment) {
        setCurrentIdx(fromIdx + 1);
        setPhase('waiting_confirmation');
        clearInterval(demoIntervalRef.current);

        let reminders = 0;
        reminderRef.current = setInterval(() => {
          reminders++;
          setReminderCount(reminders);
          if (reminders >= MAX_REMINDERS) {
            clearInterval(reminderRef.current);
            setShowHelpline(true);
          }
        }, REMINDER_INTERVAL);
      }
    };

    demoIntervalRef.current = setInterval(tick, 300);
  }, [createTransportIcon, createUserIcon]);

  /* ─── Cleanup ───────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (reminderRef.current) clearInterval(reminderRef.current);
      if (posIntervalRef.current) clearInterval(posIntervalRef.current);
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      if (panTimerRef.current) clearTimeout(panTimerRef.current);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  /* ─── Transport mode display helpers ────────────────── */
  const transportIcon = (mode: string) => {
    switch (mode) {
      case 'Flight': return <Plane className="w-4 h-4" />;
      case 'Train': return <Train className="w-4 h-4" />;
      case 'Bus': return <Bus className="w-4 h-4" />;
      case 'Car': return <Car className="w-4 h-4" />;
      case 'Footprints': return <Footprints className="w-4 h-4" />;
      default: return <Navigation className="w-4 h-4" />;
    }
  };

  const transportColor = (mode: string) => {
    switch (mode) {
      case 'Flight': return 'bg-blue-500';
      case 'Train': return 'bg-emerald-500';
      case 'Bus': return 'bg-orange-500';
      case 'Car': return 'bg-purple-500';
      case 'Footprints': return 'bg-teal-500';
      default: return 'bg-slate-500';
    }
  };

  /* ─── Current stop info ─────────────────────────────── */
  const currentStop = stops[currentIdx] || null;
  const nextStop = stops[currentIdx + 1] || null;
  const progressPct = stops.length > 1 ? Math.round((currentIdx / (stops.length - 1)) * 100) : 0;

  /* ─── Render ────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Live Journey Tracking</h2>
            <p className="text-white/50 text-xs">{stops.length} stops · Day {currentStop?.dayNumber || '—'}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        {phase === 'geocoding' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-violet-500/30" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
            </div>
            <p className="text-white font-medium">Mapping your journey...</p>
            <p className="text-white/40 text-sm mt-1">
              Geocoding {geoProgress.done}/{geoProgress.total} stops
            </p>
            <div className="w-48 h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${geoProgress.total > 0 ? (geoProgress.done / geoProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <div ref={mapRef} className="w-full h-full" />

        {/* Transport mode badge (only during inter-city transit) */}
        <AnimatePresence>
          {phase === 'transit' && currentTransportMode && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
            >
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${transportColor(currentTransportMode)} text-white text-sm font-semibold shadow-lg`}>
                {transportIcon(currentTransportMode)}
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

        {/* Local travel badge */}
        <AnimatePresence>
          {phase === 'transit' && !currentTransportMode && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg">
                <Footprints className="w-4 h-4" />
                <span>Exploring Locally</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Journey progress bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-3">
          <div className="bg-black/60 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
              <span>Stop {currentIdx + 1} of {stops.length}</span>
              <span className="text-white font-medium">{progressPct}% Complete</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="border-t border-white/10 bg-black/80 backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {/* ─── Geocoding ─── */}
          {phase === 'geocoding' && (
            <motion.div
              key="geocoding"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="px-5 py-6 text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm">
                <MapPin className="w-4 h-4 animate-pulse" />
                Preparing your route...
              </div>
            </motion.div>
          )}

          {/* ─── Transit / Moving ─── */}
          {(phase === 'transit') && nextStop && (
            <motion.div
              key="transit"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="px-5 py-4"
            >
              <div className="flex items-center gap-2 mb-2">
                {currentTransportMode ? (
                  <div className={`w-8 h-8 rounded-lg ${transportColor(currentTransportMode)} flex items-center justify-center text-white`}>
                    {transportIcon(currentTransportMode)}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white">
                    <Footprints className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-xs">
                    {currentTransportMode ? `Heading to next city via ${currentTransportMode}` : 'Moving to nearby location'}
                  </p>
                  <p className="text-white font-semibold text-sm truncate">{nextStop.name}</p>
                </div>
              </div>
              {currentTransportMode && (
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Clock className="w-3 h-3" />
                  <span>Estimated travel in progress...</span>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Waiting confirmation ─── */}
          {phase === 'waiting_confirmation' && currentStop && (
            <motion.div
              key="waiting"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="px-5 py-4"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  currentStop.isHomeStop
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {currentStop.isHomeStop
                    ? <Shield className="w-5 h-5" />
                    : <MapPin className="w-5 h-5" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base">{currentStop.name}</p>
                  <p className="text-white/50 text-xs mt-0.5">{currentStop.location}</p>
                  {currentStop.description && (
                    <p className="text-white/30 text-xs mt-1 line-clamp-2">{currentStop.description}</p>
                  )}
                </div>
              </div>

              {/* Reached button */}
              <button
                onClick={handleReached}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  currentStop.isHomeStop
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                {currentStop.isHomeStop ? 'Safely Reached Home — Complete Journey' : 'Reached'}
              </button>

              {/* Reminder counter */}
              {reminderCount > 0 && !showHelpline && (
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Reminder {reminderCount}/{MAX_REMINDERS} — Did you reach?</span>
                </div>
              )}

              {/* Helpline button (after 5 reminders) */}
              {showHelpline && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3"
                >
                  <a
                    href="tel:112"
                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse"
                  >
                    <Phone className="w-5 h-5" />
                    Call Emergency Helpline (112)
                  </a>
                  <p className="text-center text-red-400/60 text-xs mt-1.5">
                    No response detected — tap if you need help
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── Completed ─── */}
          {phase === 'completed' && (
            <motion.div
              key="completed"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="px-5 py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/40"
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-white text-xl font-bold mb-1">Journey Complete!</h3>
              <p className="text-white/50 text-sm mb-6">
                You have safely completed all {stops.length} stops. Welcome home!
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors"
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
