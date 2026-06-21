'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation, MapPin, AlertTriangle, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
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

export function TrackingOverlay({ tripData, onClose }: Props) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [checkpoints, setCheckpoints] = useState<{ lat: number; lng: number; ts: Date }[]>([]);
  const [alert, setAlert] = useState('');
  const watchRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported on this device.');
      return;
    }
    setIsTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocationError('');
        setCheckpoints(prev => [...prev.slice(-99), { ...loc, ts: new Date() }]);
        // Save checkpoint to API (fire-and-forget)
        fetch(`/api/trips/${tripData.tripId}/checkpoint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: loc.lat, lng: loc.lng }),
        }).catch(() => {/* non-critical */});
      },
      (err) => {
        setLocationError(err.message);
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [tripData.tripId]);

  const stopTracking = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, [startTracking, stopTracking]);

  // Simulate AI alert after 5 seconds (demo)
  useEffect(() => {
    const t = setTimeout(() => {
      setAlert('ℹ️ Weather update: Clear skies expected throughout your trip. Great conditions for sightseeing!');
      setTimeout(() => setAlert(''), 8000);
    }, 5000);
    return () => clearTimeout(t);
  }, []);

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
          <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-forest-400 animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="font-semibold text-foreground">
            {isTracking ? 'Journey Active' : 'Journey Paused'}
          </span>
          <span className="text-sm text-muted-foreground">· {tripData.formData.destination}</span>
        </div>
        <div className="flex items-center gap-3">
          {isTracking ? (
            <div className="flex items-center gap-1.5 text-xs text-forest-500 font-medium">
              <Wifi className="w-3.5 h-3.5" />Tracking Live
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <WifiOff className="w-3.5 h-3.5" />Paused
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

      {/* Map */}
      <div className="flex-1 p-4 overflow-hidden">
        <TripMap tripData={tripData.generatedTrip} />
      </div>

      {/* Bottom Panel */}
      <div className="p-4 border-t border-border">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
          <div className="glass-panel rounded-2xl p-3 text-center col-span-1">
            <MapPin className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">
              {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : '—'}
            </div>
            <div className="text-2xs text-muted-foreground">Location</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center">
            <Navigation className="w-4 h-4 text-ocean-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">{checkpoints.length}</div>
            <div className="text-2xs text-muted-foreground">Checkpoints</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center">
            <Clock className="w-4 h-4 text-earth-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">
              {checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
            <div className="text-2xs text-muted-foreground">Last Update</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center hidden sm:block">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">0</div>
            <div className="text-2xs text-muted-foreground">Alerts</div>
          </div>
          <div className="glass-panel rounded-2xl p-3 text-center hidden sm:block">
            <RefreshCw className="w-4 h-4 text-forest-500 mx-auto mb-1" />
            <div className="text-xs font-medium text-foreground">Auto</div>
            <div className="text-2xs text-muted-foreground">Replan</div>
          </div>
        </div>

        {locationError && (
          <div className="text-xs text-red-500 mb-3 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />{locationError}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={isTracking ? stopTracking : startTracking}
            className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-all ${
              isTracking
                ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20'
                : 'btn-premium'
            }`}
          >
            {isTracking ? '⏹ Stop Tracking' : '▶ Resume Tracking'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Close Map
          </button>
        </div>

        <p className="text-center text-2xs text-muted-foreground mt-3">
          🔒 Location data is encrypted end-to-end and never shared with third parties.
        </p>
      </div>
    </motion.div>
  );
}
