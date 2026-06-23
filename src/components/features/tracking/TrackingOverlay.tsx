'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Navigation, MapPin, AlertTriangle, Clock,
  Plane, Train, Bus, Car, Flag, Phone, CheckCircle2,
  Bell, Hotel, Utensils, Camera, ChevronRight
} from 'lucide-react';
import TripMap from '@/components/features/map/TripMap';
import type { GeneratedTrip, TripFormData } from '@/types';

/* ─── Types ─────────────────────────────────────────────── */

interface TripData {
  tripId: string;
  formData: TripFormData;
  generatedTrip: GeneratedTrip;
  createdAt: string;
  originLat?: number | null;
  originLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
}

interface Props {
  tripData: TripData;
  onClose: () => void;
}

interface Coord { lat: number; lng: number; }

interface ItineraryStop {
  id: string;
  label: string;
  location: string;
  coord: Coord | null;
  type: 'origin' | 'destination' | 'hotel' | 'activity' | 'food';
  day: number;
  needsConfirmation: boolean;
  confirmed: boolean;
  transportTo: string;
  isInterCity: boolean;
}

type Phase = 'geocoding' | 'transit' | 'waiting_confirmation' | 'completed';

/* ─── Constants ─────────────────────────────────────────── */

const REMINDER_INTERVAL_MS = 15_000;
const MAX_REMINDERS = 5;
const TRANSIT_DURATION_MS = 6_000;
const TRANSIT_STEPS = 80;
const EMERGENCY_NUMBER = 'tel:112';

/* ─── Helpers ───────────────────────────────────────────── */

async function geocodeLocation(query: string): Promise<Coord | null> {
  if (!query || query.trim().length < 2) return null;
  const attempts = [query.trim(), `${query.trim()}, India`];
  for (const q of attempts) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': 'Wandr-App/1.0' } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch { continue; }
  }
  return null;
}

function interpolatePath(from: Coord, to: Coord, steps: number): Coord[] {
  const points: Coord[] = [];
  const dist = Math.sqrt((to.lat - from.lat) ** 2 + (to.lng - from.lng) ** 2);
  const arcHeight = dist * 0.12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = from.lat + (to.lat - from.lat) * t + Math.sin(t * Math.PI) * arcHeight * 0.7;
    const lng = from.lng + (to.lng - from.lng) * t - Math.sin(t * Math.PI) * arcHeight * 0.3;
    points.push({ lat, lng });
  }
  return points;
}

function getModeFromTitle(title: string): string {
  const t = (title || '').toLowerCase();
  if (t.includes('flight') || t.includes('air')) return 'FLIGHT';
  if (t.includes('train') || t.includes('rail') || t.includes('metro')) return 'TRAIN';
  if (t.includes('bus') || t.includes('coach')) return 'BUS';
  return 'CAR';
}

function getTransportIcon(mode: string, cls = 'w-4 h-4') {
  switch ((mode || '').toUpperCase()) {
    case 'FLIGHT': return <Plane className={cls} />;
    case 'TRAIN': return <Train className={cls} />;
    case 'BUS': return <Bus className={cls} />;
    default: return <Car className={cls} />;
  }
}

function getStopIcon(type: string) {
  switch (type) {
    case 'hotel': return <Hotel className="w-4 h-4" />;
    case 'food': return <Utensils className="w-4 h-4" />;
    case 'origin': case 'destination': return <Flag className="w-4 h-4" />;
    default: return <Camera className="w-4 h-4" />;
  }
}

function getStopColor(type: string) {
  switch (type) {
    case 'hotel': return 'bg-orange-500';
    case 'food': return 'bg-green-500';
    case 'origin': return 'bg-blue-500';
    case 'destination': return 'bg-purple-500';
    default: return 'bg-teal-500';
  }
}

/* ─── Build all itinerary stops ─────────────────────────── */

function buildItineraryStops(fd: TripFormData, trip: GeneratedTrip): ItineraryStop[] {
  const stops: ItineraryStop[] = [];
  let stopId = 0;
  let currentTransport = (fd.transportPreferences || [])[0] || 'CAR';
  let prevLocation = (fd.origin || '').toLowerCase().trim();

  stops.push({
    id: `stop-${stopId++}`, label: 'Home', location: fd.origin, coord: null,
    type: 'origin', day: 0, needsConfirmation: false, confirmed: true,
    transportTo: currentTransport, isInterCity: true,
  });

  for (const day of (trip.days || [])) {
    for (const act of (day.activities || [])) {
      if (act.type === 'TRANSPORT') {
        currentTransport = getModeFromTitle(act.title);
        continue;
      }
      const typeMap: Record<string, ItineraryStop['type']> = {
        HOTEL: 'hotel', ACCOMMODATION: 'hotel', CHECK_IN: 'hotel', CHECK_OUT: 'hotel',
        FOOD: 'food', RESTAURANT: 'food', DINING: 'food', BREAKFAST: 'food', LUNCH: 'food', DINNER: 'food',
        ACTIVITY: 'activity', SIGHTSEEING: 'activity', ATTRACTION: 'activity',
        ADVENTURE: 'activity', WELLNESS: 'activity', CULTURAL: 'activity',
        FREE_TIME: 'activity', EXPLORE: 'activity', VISIT: 'activity',
      };
      const actLocation = (act.location || '').toLowerCase().trim();
      const isInterCity = actLocation !== '' && actLocation !== prevLocation;

      stops.push({
        id: `stop-${stopId++}`,
        label: act.title || act.location || 'Stop',
        location: act.location || '',
        coord: null,
        type: typeMap[act.type] || 'activity',
        day: day.dayNumber,
        needsConfirmation: true,
        confirmed: false,
        transportTo: isInterCity ? currentTransport : '',
        isInterCity,
      });

      if (actLocation) prevLocation = actLocation;
    }
  }

  stops.push({
    id: `stop-${stopId++}`, label: fd.destination, location: fd.destination, coord: null,
    type: 'destination', day: (trip.days || []).length + 1, needsConfirmation: true, confirmed: false,
    transportTo: currentTransport, isInterCity: true,
  });

  stops.push({
    id: `stop-${stopId++}`, label: 'Home \u2014 Safe Return', location: fd.origin, coord: null,
    type: 'origin', day: (trip.days || []).length + 2, needsConfirmation: true, confirmed: false,
    transportTo: currentTransport, isInterCity: true,
  });

  return stops;
}

/* ─── Main Component ────────────────────────────────────── */

export function TrackingOverlay({ tripData, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('geocoding');
  const [stops, setStops] = useState<ItineraryStop[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<Coord | null>(null);
  const [currentTransportMode, setCurrentTransportMode] = useState('');
  const [alert, setAlert] = useState('');
  const [checkpoints, setCheckpoints] = useState<{ lat: number; lng: number; ts: Date }[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [remindersSent, setRemindersSent] = useState(0);
  const [showHelpline, setShowHelpline] = useState(false);

  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reminderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number>(0);
  const totalElapsedRef = useRef(0);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fd = tripData.formData;
  const trip = tripData.generatedTrip;
  const tripId = tripData.tripId;

  const currentStop = stops[currentStopIndex] || null;
  const nextStop = stops[currentStopIndex + 1] || null;
  const confirmedCount = stops.filter(s => s.confirmed).length;
  const totalConfirmable = stops.filter(s => s.needsConfirmation).length;
  const isSafeReturnStop = currentStop?.label === 'Home \u2014 Safe Return';

  /* ─── Geocode all stops ──────────────────────────────── */
  useEffect(() => {
    async function init() {
      setPhase('geocoding');
      showAlert('Mapping all itinerary locations...');

      const itineraryStops = buildItineraryStops(fd, trip);
      const locationMap = new Map<string, Coord>();

      if (fd.origin && tripData.originLat) {
        locationMap.set(fd.origin, { lat: tripData.originLat, lng: tripData.originLng! });
      }
      if (fd.destination && tripData.destLat) {
        locationMap.set(fd.destination, { lat: tripData.destLat, lng: tripData.destLng! });
      }

      const uncoded = [...new Set(
        itineraryStops.map(s => s.location).filter(l => l && l.length >= 2 && !locationMap.has(l))
      )];

      showAlert(`Geocoding ${uncoded.length} unique locations...`);

      for (let i = 0; i < uncoded.length; i += 2) {
        const batch = uncoded.slice(i, i + 2);
        const results = await Promise.all(batch.map(c => geocodeLocation(c)));
        batch.forEach((city, idx) => {
          if (results[idx]) locationMap.set(city, results[idx]!);
        });
        if (i + 2 < uncoded.length) await new Promise(r => setTimeout(r, 1100));
      }

      const cityCount = new Map<string, number>();
      const destCoord = locationMap.get(fd.destination) || locationMap.values().next().value;

      const updatedStops = itineraryStops.map(stop => {
        const base = locationMap.get(stop.location);
        if (base) {
          const count = cityCount.get(stop.location) || 0;
          cityCount.set(stop.location, count + 1);
          const off = 0.006 * (count + 1);
          return { ...stop, coord: { lat: base.lat + off * (count % 2 === 0 ? 1 : -1), lng: base.lng + off * (count % 2 === 0 ? -1 : 1) } };
        }
        if (destCoord) {
          const count = cityCount.get('__fb') || 0;
          cityCount.set('__fb', count + 1);
          const off = 0.012 * (count + 1);
          return { ...stop, coord: { lat: destCoord.lat + off * (count % 2 === 0 ? 1 : -0.5), lng: destCoord.lng + off * (count % 2 === 0 ? -1 : 0.5) } };
        }
        return { ...stop, coord: { lat: 20.5937, lng: 78.9629 } };
      });

      setStops(updatedStops);
      setCurrentPosition(updatedStops[0]?.coord || null);

      const originCoord = locationMap.get(fd.origin);
      if (originCoord && destCoord) {
        fetch(`/api/trips/${tripId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originLat: originCoord.lat, originLng: originCoord.lng, destLat: destCoord.lat, destLng: destCoord.lng }),
        }).catch(() => {});
      }

      showAlert(`${updatedStops.length} stops mapped! Starting journey...`);
      setPhase('transit');
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Transit animation ──────────────────────────────── */
  useEffect(() => {
    if (phase !== 'transit' || !currentStop || !nextStop || !currentStop.coord || !nextStop.coord) return;

    const path = interpolatePath(currentStop.coord, nextStop.coord, TRANSIT_STEPS);
    const isInterCity = nextStop.isInterCity;
    setCurrentTransportMode(isInterCity ? nextStop.transportTo : '');
    const startTime = performance.now();
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const progress = Math.min((performance.now() - startTime) / TRANSIT_DURATION_MS, 1);
      const step = Math.floor(progress * (TRANSIT_STEPS - 1));
      setCurrentPosition(path[Math.min(step, path.length - 1)]);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setCurrentStopIndex(prev => prev + 1);
        if (nextStop.needsConfirmation) {
          setPhase('waiting_confirmation');
          showAlert(`Arrived at ${nextStop.label}! Tap "Reached" to confirm.`);
        } else {
          showAlert(`Passing through ${nextStop.label}...`);
          setTimeout(() => setPhase('transit'), 1200);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(animFrameRef.current); };
  }, [phase, currentStopIndex, stops]);

  /* ─── Elapsed time ───────────────────────────────────── */
  useEffect(() => {
    elapsedIntervalRef.current = setInterval(() => {
      totalElapsedRef.current += 1;
      setElapsed(totalElapsedRef.current);
    }, 1000);
    return () => { if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current); };
  }, []);

  /* ─── Reminders ──────────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'waiting_confirmation') {
      if (reminderTimerRef.current) { clearInterval(reminderTimerRef.current); reminderTimerRef.current = null; }
      setRemindersSent(0); setShowHelpline(false);
      return;
    }
    reminderTimerRef.current = setInterval(() => {
      setRemindersSent(prev => {
        const next = prev + 1;
        if (next >= MAX_REMINDERS) {
          if (reminderTimerRef.current) { clearInterval(reminderTimerRef.current); reminderTimerRef.current = null; }
          setShowHelpline(true);
          showAlert('No response! Tap the helpline button for assistance.');
        } else {
          showAlert(`Reminder ${next}/${MAX_REMINDERS}: Have you reached ${currentStop?.label}?`);
        }
        return next;
      });
    }, REMINDER_INTERVAL_MS);
    return () => { if (reminderTimerRef.current) { clearInterval(reminderTimerRef.current); reminderTimerRef.current = null; } };
  }, [phase, currentStop]);

  /* ─── Confirm Reached ────────────────────────────────── */
  const confirmReached = useCallback(() => {
    if (!currentStop) return;
    setStops(prev => prev.map((s, i) => i === currentStopIndex ? { ...s, confirmed: true } : s));
    showAlert(`Confirmed: ${currentStop.label}`);
    setRemindersSent(0); setShowHelpline(false);
    if (currentStopIndex >= stops.length - 1) {
      setPhase('completed');
      showAlert('Safe return confirmed! Journey complete.');
    } else {
      setCurrentStopIndex(prev => prev + 1);
      setTimeout(() => setPhase('transit'), 800);
    }
  }, [currentStop, currentStopIndex, stops.length]);

  /* ─── Cleanup ────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      if (reminderTimerRef.current) clearInterval(reminderTimerRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  function showAlert(msg: string) {
    setAlert(msg);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => setAlert(''), 6000);
  }

  function fmtDur(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            phase === 'transit' ? (currentTransportMode ? 'bg-blue-400' : 'bg-yellow-400') + ' animate-pulse'
            : phase === 'waiting_confirmation' ? 'bg-yellow-400 animate-pulse'
            : phase === 'completed' ? 'bg-green-500'
            : 'bg-muted-foreground animate-pulse'
          }`} />
          <span className="font-semibold text-foreground text-sm">
            {phase === 'geocoding' && 'Mapping Route...'}
            {phase === 'transit' && (currentTransportMode ? `En Route \u2014 ${nextStop?.label || ''}` : `Moving to \u2014 ${nextStop?.label || ''}`)}
            {phase === 'waiting_confirmation' && `Arrived \u2014 ${currentStop?.label || ''}`}
            {phase === 'completed' && 'Journey Complete'}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">{fd.destination}</span>
        </div>
        <div className="flex items-center gap-3">
          {phase === 'transit' && currentTransportMode && (
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
              {getTransportIcon(currentTransportMode, 'w-3.5 h-3.5')}<span>{currentTransportMode}</span>
              <Navigation className="w-3.5 h-3.5 animate-spin" />
            </div>
          )}
          {phase === 'transit' && !currentTransportMode && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400 font-medium">
              <MapPin className="w-3.5 h-3.5" /><span>Local Travel</span>
            </div>
          )}
          {phase === 'waiting_confirmation' && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400 font-medium">
              <MapPin className="w-3.5 h-3.5" />Awaiting Confirmation
            </div>
          )}
          {phase === 'completed' && (
            <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />All Stops Confirmed
            </div>
          )}
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alert */}
      <AnimatePresence>
        {alert && (
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
            className="mx-4 mt-3 glass-panel rounded-2xl px-4 py-3 text-sm text-foreground border-primary/20 border">{alert}</motion.div>
        )}
      </AnimatePresence>

      {/* Stop progress */}
      {stops.length > 1 && (
        <div className="mx-4 mt-3 flex items-center gap-1 overflow-x-auto scrollbar-hide px-1">
          {stops.map((stop, i) => (
            <div key={stop.id} className="flex items-center gap-1 flex-shrink-0">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${
                stop.confirmed ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                : i === currentStopIndex ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-muted/50 text-muted-foreground border border-transparent'
              }`}>
                {stop.confirmed ? <CheckCircle2 className="w-3 h-3" />
                  : i === currentStopIndex && phase === 'transit' && stop.isInterCity ? getTransportIcon(stop.transportTo, 'w-3 h-3')
                  : i === currentStopIndex && phase === 'transit' ? <MapPin className="w-3 h-3" />
                  : getStopIcon(stop.type)}
                <span className="max-w-[80px] truncate">{stop.label.length > 12 ? stop.label.slice(0, 12) + '...' : stop.label}</span>
              </div>
              {i < stops.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 p-4 overflow-hidden relative">
        {phase === 'transit' && currentStop && nextStop && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 glass-panel rounded-2xl px-4 py-2 shadow-lg">
            {currentTransportMode ? (
              <>{getTransportIcon(currentTransportMode, 'w-5 h-5 text-primary')}<span className="text-sm font-medium text-foreground">{currentStop.label} &rarr; {nextStop.label}</span></>
            ) : (
              <><MapPin className="w-5 h-5 text-yellow-400" /><span className="text-sm font-medium text-foreground">Walking to {nextStop.label}</span></>
            )}
          </div>
        )}
        {phase === 'waiting_confirmation' && currentStop && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 glass-panel rounded-2xl px-4 py-2 shadow-lg">
            <MapPin className="w-5 h-5 text-yellow-400" /><span className="text-sm font-medium text-foreground">At: {currentStop.label}</span>
          </div>
        )}
        <TripMap
          trip={trip}
          userLocation={currentPosition}
          showRoute
          userTransportMode={phase === 'transit' && currentTransportMode ? currentTransportMode : null}
          allStopCoords={stops.map(s => s.coord).filter((c): c is Coord => c !== null)}
        />
      </div>

      {/* Bottom Panel */}
      <div className="p-4 border-t border-border">
        {currentStop && (
          <div className="glass-panel rounded-2xl p-3 mb-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl ${getStopColor(currentStop.type)}/15 flex items-center justify-center text-primary flex-shrink-0`}>
              {phase === 'transit' && currentTransportMode ? getTransportIcon(currentTransportMode, 'w-4 h-4')
                : phase === 'transit' ? <MapPin className="w-4 h-4" />
                : getStopIcon(currentStop.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">
                {phase === 'transit' ? (currentTransportMode ? 'Heading to' : 'Walking to') : phase === 'waiting_confirmation' ? 'Arrived at' : 'Completed'}
                {currentStop.day > 0 && ` \u00b7 Day ${currentStop.day}`}
              </div>
              <div className="text-sm font-medium text-foreground truncate">{currentStop.label}</div>
              <div className="text-[10px] text-muted-foreground truncate">{currentStop.location}</div>
            </div>
            {phase === 'transit' && currentTransportMode && (
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-muted-foreground">Mode</div>
                <div className="text-sm font-medium text-foreground uppercase flex items-center gap-1">
                  {getTransportIcon(currentTransportMode, 'w-3.5 h-3.5')}{currentTransportMode}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
          <div className="glass-panel rounded-2xl p-3 text-center">
            <MapPin className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">{currentPosition ? `${currentPosition.lat.toFixed(2)}, ${currentPosition.lng.toFixed(2)}` : '\u2014'}</div>
            <div className="text-2xs text-muted-foreground">Position</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center">
            <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">{fmtDur(elapsed)}</div>
            <div className="text-2xs text-muted-foreground">Elapsed</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center">
            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">{confirmedCount}/{totalConfirmable}</div>
            <div className="text-2xs text-muted-foreground">Confirmed</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center hidden sm:block">
            <Flag className="w-4 h-4 text-teal-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">{currentStopIndex + 1}/{stops.length}</div>
            <div className="text-2xs text-muted-foreground">Stop</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center hidden sm:block">
            <Bell className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">{remindersSent}/{MAX_REMINDERS}</div>
            <div className="text-2xs text-muted-foreground">Reminders</div>
          </div>
        </div>

        {phase === 'geocoding' && (
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <Navigation className="w-3 h-3 animate-spin" />Mapping all itinerary locations...
          </div>
        )}

        {phase === 'transit' && (
          <div className="flex gap-3">
            <button onClick={() => {
              if (nextStop) { setCurrentStopIndex(p => p + 1); setPhase('waiting_confirmation'); showAlert(`Tap "Reached" for ${nextStop.label}.`); }
            }} className="flex-1 py-3 rounded-2xl text-sm font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all">Stop Here</button>
            <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Close</button>
          </div>
        )}

        {phase === 'waiting_confirmation' && (
          <div className="flex flex-col gap-3">
            <button onClick={confirmReached} className="w-full py-3.5 rounded-2xl text-sm font-semibold btn-premium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {isSafeReturnStop ? "I've Reached Home Safely" : `I've Reached \u2014 ${currentStop?.label || 'Destination'}`}
            </button>
            {remindersSent > 0 && !showHelpline && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div className="h-full bg-yellow-400 rounded-full" animate={{ width: `${(remindersSent / MAX_REMINDERS) * 100}%` }} />
                </div>
                <span className="text-[10px] text-yellow-400 font-medium">{remindersSent}/{MAX_REMINDERS}</span>
              </div>
            )}
            {showHelpline && (
              <motion.a initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} href={EMERGENCY_NUMBER}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold bg-red-500 text-white flex items-center justify-center gap-2 hover:bg-red-600 transition-colors">
                <Phone className="w-4 h-4" />Call Helpline \u2014 No Response
              </motion.a>
            )}
            <button onClick={onClose} className="w-full py-3 rounded-2xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Close (journey resumes on return)</button>
          </div>
        )}

        {phase === 'completed' && (
          <button onClick={onClose} className="w-full py-3 rounded-2xl text-sm font-medium btn-premium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />Trip Complete \u2014 Close
          </button>
        )}

        <p className="text-center text-2xs text-muted-foreground mt-3">Simulated demo journey \u2014 no real location is tracked.</p>
      </div>
    </motion.div>
  );
}
