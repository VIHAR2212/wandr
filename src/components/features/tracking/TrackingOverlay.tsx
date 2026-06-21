'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation, MapPin, AlertTriangle, Clock, Plane, Train, Bus, Car, Flag } from 'lucide-react';
import TripMap from '@/components/features/map/TripMap';
import type { GeneratedTrip, TripFormData } from '@/types';

interface TripData {
  tripId: string;
  formData: TripFormData;
  generatedTrip: GeneratedTrip;
  createdAt: string;
}

interface Props {
  tripData: TripData;
  onClose: () => void;
}

interface Coord { lat: number; lng: number; }

interface JourneyLeg {
  from: string;
  to: string;
  fromCoord: Coord;
  toCoord: Coord;
  mode: string;
}

// ─── Nominatim geocoder (free, no API key) ───────────────────
async function geocodeCity(city: string): Promise<Coord | null> {
  try {
    const q = encodeURIComponent(city.trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
      { headers: { 'User-Agent': 'Wandr-App/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Interpolate a curved path between two coords ──────────
function interpolatePath(from: Coord, to: Coord, steps: number): Coord[] {
  const points: Coord[] = [];
  // Arc offset for visual realism (simulate great-circle curve)
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const dist = Math.sqrt((to.lat - from.lat) ** 2 + (to.lng - from.lng) ** 2);
  const arcHeight = dist * 0.15; // 15% of distance as arc

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Linear interpolation
    let lat = from.lat + (to.lat - from.lat) * t;
    let lng = from.lng + (to.lng - from.lng) * t;
    // Add sine-wave arc perpendicular to the line
    const arc = Math.sin(t * Math.PI) * arcHeight;
    // Perpendicular direction (roughly north)
    lat += arc * 0.7;
    lng -= arc * 0.3;
    points.push({ lat, lng });
  }
  return points;
}

// ─── Determine transport legs from trip data ─────────────────
function buildJourneyLegs(fd: TripFormData, trip: GeneratedTrip): JourneyLeg[] {
  const legs: JourneyLeg[] = [];
  const origin = fd.origin || 'Origin';
  const destination = fd.destination || 'Destination';

  // Find all transport-type activities across days
  const transportActivities: { location: string; mode: string; day: number }[] = [];
  (trip.days || []).forEach((day) => {
    (day.activities || []).forEach((act) => {
      if (act.type === 'transport') {
        transportActivities.push({
          location: act.location || '',
          mode: (act.title || '').toLowerCase().includes('flight') ? 'FLIGHT'
            : (act.title || '').toLowerCase().includes('train') ? 'TRAIN'
            : (act.title || '').toLowerCase().includes('bus') ? 'BUS'
            : 'CAR',
          day: day.dayNumber,
        });
      }
    });
  });

  // Build legs: origin → first transport → ... → destination
  if (transportActivities.length === 0) {
    // Single leg: origin → destination
    const mode = (fd.transportPreferences || [])[0] || 'FLIGHT';
    legs.push({
      from: origin,
      to: destination,
      fromCoord: { lat: 0, lng: 0 },
      toCoord: { lat: 0, lng: 0 },
      mode,
    });
  } else {
    // Multi-leg: origin → transport locations → destination
    let prevCity = origin;
    let prevCoord: Coord = { lat: 0, lng: 0 };
    for (const ta of transportActivities) {
      legs.push({
        from: prevCity,
        to: ta.location || destination,
        fromCoord: prevCoord,
        toCoord: { lat: 0, lng: 0 },
        mode: ta.mode,
      });
      prevCity = ta.location || destination;
      prevCoord = { lat: 0, lng: 0 };
    }
    // Final leg to destination
    if (prevCity !== destination) {
      legs.push({
        from: prevCity,
        to: destination,
        fromCoord: prevCoord,
        toCoord: { lat: 0, lng: 0 },
        mode: 'CAR',
      });
    }
  }

  return legs;
}

function getTransportIcon(mode: string) {
  switch ((mode || '').toUpperCase()) {
    case 'FLIGHT': return <Plane className="w-4 h-4" />;
    case 'TRAIN': return <Train className="w-4 h-4" />;
    case 'BUS': return <Bus className="w-4 h-4" />;
    default: return <Car className="w-4 h-4" />;
  }
}

// ─── Main Component ─────────────────────────────────────────
export function TrackingOverlay({ tripData, onClose }: Props) {
  const [phase, setPhase] = useState<'geocoding' | 'ready' | 'animating' | 'paused' | 'completed'>('geocoding');
  const [legs, setLegs] = useState<JourneyLeg[]>([]);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<Coord | null>(null);
  const [alert, setAlert] = useState('');
  const [checkpoints, setCheckpoints] = useState<{ lat: number; lng: number; ts: Date }[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [journeyDone, setJourneyDone] = useState(false);

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fd = tripData.formData;
  const trip = tripData.generatedTrip;
  const tripId = tripData.tripId;

  // Total animation duration per leg (ms) — 2 min per leg
  const MS_PER_LEG = 2 * 60 * 1000;
  const STEPS_PER_LEG = 200;

  // ─── Geocode all cities and build journey ──────────────────
  useEffect(() => {
    async function initJourney() {
      setPhase('geocoding');
      showAlert('🗺️ Mapping your journey route...');

      const journeyLegs = buildJourneyLegs(fd, trip);

      // Geocode each unique city (dedup by name)
      const cityCoords = new Map<string, Coord>();
      const cities = new Set<string>();
      for (const leg of journeyLegs) {
        cities.add(leg.from);
        cities.add(leg.to);
      }

      // Check if trip already has coords for origin/destination
      // (from a previous geocode or from AI generation)
      if (fd.origin && (tripData as any).originLat) {
        cityCoords.set(fd.origin, { lat: (tripData as any).originLat, lng: (tripData as any).originLng });
      }
      if (fd.destination && (tripData as any).destLat) {
        cityCoords.set(fd.destination, { lat: (tripData as any).destLat, lng: (tripData as any).destLng });
      }

      // Geocode missing cities in parallel (max 3 at a time)
      const uncodedCities = [...cities].filter(c => !cityCoords.has(c));
      for (let i = 0; i < uncodedCities.length; i += 3) {
        const batch = uncodedCities.slice(i, i + 3);
        const results = await Promise.all(batch.map(c => geocodeCity(c)));
        batch.forEach((city, idx) => {
          if (results[idx]) cityCoords.set(city, results[idx]!);
        });
      }

      // Apply coords to legs
      for (const leg of journeyLegs) {
        leg.fromCoord = cityCoords.get(leg.from) || { lat: 0, lng: 0 };
        leg.toCoord = cityCoords.get(leg.to) || { lat: 0, lng: 0 };
      }

      setLegs(journeyLegs);
      setCurrentPosition(journeyLegs[0]?.fromCoord || null);

      // Save geocoded coords back to trip if origin/dest were resolved
      const originCoord = cityCoords.get(fd.origin);
      const destCoord = cityCoords.get(fd.destination);
      if (originCoord && destCoord) {
        fetch(`/api/trips/${tripId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originLat: originCoord.lat,
            originLng: originCoord.lng,
            destLat: destCoord.lat,
            destLng: destCoord.lng,
          }),
        }).catch(() => { /* non-critical */ });
      }

      setPhase('ready');
      showAlert(`✅ Route mapped! ${journeyLegs.length} leg${journeyLegs.length > 1 ? 's' : ''} ready. Starting journey...`);
    }

    initJourney();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Auto-start journey 2s after ready ────────────────────
  useEffect(() => {
    if (phase !== 'ready') return;
    const t = setTimeout(() => startJourney(), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  // ─── Journey animation via requestAnimationFrame ───────────
  const startJourney = useCallback(() => {
    setPhase('animating');
    startTimeRef.current = performance.now();
    setElapsed(0);
    animate();
  }, []);

  const animate = useCallback(() => {
    const tick = () => {
      setLegs(prev => prev);
      // Use refs for latest state inside rAF
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Separate effect for actual animation loop to avoid stale closures
  useEffect(() => {
    if (phase !== 'animating' || legs.length === 0) return;

    const path = interpolatePath(
      legs[currentLegIndex].fromCoord,
      legs[currentLegIndex].toCoord,
      STEPS_PER_LEG
    );

    const legStart = performance.now();
    let animFrame: number;

    function tick() {
      const now = performance.now();
      const elapsed = now - legStart;
      const progress = Math.min(elapsed / MS_PER_LEG, 1);
      const step = Math.floor(progress * (STEPS_PER_LEG - 1));
      const point = path[Math.min(step, path.length - 1)];

      setCurrentPosition(point);
      setElapsed(Math.floor(elapsed / 1000));
      setCheckpoints(prev => {
        const last = prev[prev.length - 1];
        if (!last || Math.abs(last.lat - point.lat) > 0.001 || Math.abs(last.lng - point.lng) > 0.001) {
          return [...prev.slice(-99), { ...point, ts: new Date() }];
        }
        return prev;
      });

      if (progress < 1) {
        animFrame = requestAnimationFrame(tick);
      } else {
        // Leg complete
        const leg = legs[currentLegIndex];
        if (currentLegIndex < legs.length - 1) {
          // More legs remaining
          showAlert(`📍 Arrived at ${leg.to}! Next leg starting...`);
          setCurrentLegIndex(prev => prev + 1);
          setPhase('paused');
          // Resume next leg after 3s pause
          setTimeout(() => {
            setPhase('animating');
          }, 3000);
        } else {
          // Journey complete
          showAlert(`🎉 Reached ${leg.to} safely! Trip complete.`);
          setPhase('completed');
          setJourneyDone(true);
        }
      }
    }

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [phase, currentLegIndex, legs]);

  // ─── Helper: show alert with auto-dismiss ─────────────────
  function showAlert(msg: string) {
    setAlert(msg);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => setAlert(''), 6000);
  }

  // ─── Cleanup ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);

  // ─── Formatters ───────────────────────────────────────────
  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const currentLeg = legs[currentLegIndex] || null;
  const progress = currentLeg ? Math.min((elapsed / (MS_PER_LEG / 1000)) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border glass-panel rounded-none">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            phase === 'animating' ? 'bg-forest-400 animate-pulse'
            : phase === 'completed' ? 'bg-primary'
            : 'bg-muted-foreground animate-pulse'
          }`} />
          <span className="font-semibold text-foreground">
            {phase === 'geocoding' && 'Mapping Route...'}
            {phase === 'ready' && 'Ready to Start'}
            {phase === 'animating' && `Leg ${currentLegIndex + 1}/${legs.length} Active`}
            {phase === 'paused' && 'Brief Stop'}
            {phase === 'completed' && 'Journey Complete'}
          </span>
          <span className="text-sm text-muted-foreground">· {fd.destination}</span>
        </div>
        <div className="flex items-center gap-3">
          {phase === 'animating' ? (
            <div className="flex items-center gap-1.5 text-xs text-forest-500 font-medium">
              <Navigation className="w-3.5 h-3.5 animate-spin" />En Route
            </div>
          ) : phase === 'completed' ? (
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
              <Flag className="w-3.5 h-3.5" />Arrived
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />Preparing
            </div>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alert banner */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="mx-4 mt-3 glass-panel rounded-2xl px-4 py-3 text-sm text-foreground border-primary/20 border"
          >
            {alert}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journey progress bar */}
      {legs.length > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2">
          {legs.map((leg, i) => (
            <div key={i} className="flex items-center gap-1 flex-1 min-w-0">
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${i < currentLegIndex ? 'bg-forest-400' : i === currentLegIndex ? 'bg-primary/30' : 'bg-muted'}`}>
                {i === currentLegIndex && (
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
              <span className="text-2xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                {leg.to.length > 10 ? leg.to.slice(0, 10) + '…' : leg.to}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 p-4 overflow-hidden">
        <TripMap tripData={trip} />
      </div>

      {/* Bottom Panel */}
      <div className="p-4 border-t border-border">
        {/* Current leg info */}
        {currentLeg && (
          <div className="glass-panel rounded-2xl p-3 mb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              {getTransportIcon(currentLeg.mode)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Current Leg</div>
              <div className="text-sm font-medium text-foreground truncate">
                {currentLeg.from} → {currentLeg.to}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-muted-foreground">Mode</div>
              <div className="text-sm font-medium text-foreground uppercase">{currentLeg.mode}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
          <div className="glass-panel rounded-2xl p-3 text-center">
            <MapPin className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">
              {currentPosition ? `${currentPosition.lat.toFixed(2)}, ${currentPosition.lng.toFixed(2)}` : '—'}
            </div>
            <div className="text-2xs text-muted-foreground">Position</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center">
            <Navigation className="w-4 h-4 text-ocean-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">
              {formatDuration(elapsed)}
            </div>
            <div className="text-2xs text-muted-foreground">Elapsed</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center">
            <Clock className="w-4 h-4 text-earth-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">
              {checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
            <div className="text-2xs text-muted-foreground">Last Update</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center hidden sm:block">
            <Flag className="w-4 h-4 text-forest-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">{currentLegIndex + 1}/{legs.length}</div>
            <div className="text-2xs text-muted-foreground">Leg</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center hidden sm:block">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">0</div>
            <div className="text-2xs text-muted-foreground">Alerts</div>
          </div>
        </div>

        {phase === 'geocoding' && (
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <Navigation className="w-3 h-3 animate-spin" />Geocoding route cities...
          </div>
        )}

        <div className="flex gap-3">
          {phase === 'animating' ? (
            <button
              onClick={() => setPhase('paused')}
              className="flex-1 py-3 rounded-2xl text-sm font-medium bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-all"
            >
              ⏹ Pause Journey
            </button>
          ) : phase === 'paused' ? (
            <button
              onClick={() => setPhase('animating')}
              className="flex-1 py-3 rounded-2xl text-sm font-medium btn-premium"
            >
              ▶ Resume Journey
            </button>
          ) : phase === 'completed' ? (
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-sm font-medium btn-premium"
            >
              ✅ Done — Close
            </button>
          ) : (
            <button
              disabled
              className="flex-1 py-3 rounded-2xl text-sm font-medium bg-muted text-muted-foreground cursor-not-allowed"
            >
              Preparing...
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Close
          </button>
        </div>

        <p className="text-center text-2xs text-muted-foreground mt-3">
          🗺️ Simulated demo journey — no real location is tracked.
        </p>
      </div>
    </motion.div>
  );
}
